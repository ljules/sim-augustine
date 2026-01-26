import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';


import { CircuitStoreService } from '../../core/services/circuit-store.service';
import { StrategyStoreService } from '../../core/services/strategy-store.service';
import { VehicleStoreService } from '../../core/services/vehicle-store.service';

import { Circuit } from '../../domain/circuit/circuit';
import { Motor } from '../../domain/vehicle/motor';
import { Vehicle } from '../../domain/vehicle/vehicle';

import { IntervalStrategy } from '../../domain/strategy/interval-strategy';
import { simulateEulerIntervals, simulateRK4Intervals } from '../../domain/simulation/simulate-intervals';
import { SimResult } from '../../domain/types';
import { StrategyConfig } from '../../domain/types';

import { SpeedChartComponent } from '../../shared/components/speed-chart/speed-chart.component';
import { AltitudeChartComponent } from '../../shared/components/altitude-chart/altitude-chart.component';
import { CurrentChartComponent } from '../../shared/components/current-chart/current-chart.component';
import { EnergyChartComponent } from '../../shared/components/energy-chart/energy-chart.component';
import { StrategyTimelineComponent, Interval } from "../../shared/components/strategy-timeline/strategy-timeline.component";
import { DualSpeedAltitudeChartComponent } from '../../shared/components/dual-speed-altitude-chart/dual-speed-altitude-chart.component';

type SolverMethod = 'Euler' | 'RK4';
type ComputeMode = 'live'  | 'deferred';


@Component({
    selector: 'app-simulation-page',
    standalone: true,
    imports: [
    CommonModule,
    FormsModule,
    SpeedChartComponent,
    AltitudeChartComponent,
    CurrentChartComponent,
    EnergyChartComponent,
    StrategyTimelineComponent,
    DualSpeedAltitudeChartComponent,
],
    templateUrl: './simulation-page.component.html',
    styleUrl: './simulation-page.component.css'
})


export class SimulationPageComponent {
    dt = 0.2;
    tMax = 400;

    lastMethod: 'Euler' | 'RK4' | null = null;
    result: SimResult | null = null;
    error: string | null = null;

    strategyIntervals: { d: number; f: number }[] = [];

    speedUnit: 'mps' | 'kmh' = 'kmh';

    circuitProfile = this.circuitStore.getCircuit();

    distanceMax = 1000;
    cfg: StrategyConfig;

    solver: SolverMethod = "RK4"        // Valeur par défaut pour le calcul de la simulation.
    computeMode: ComputeMode = 'live'   // Mode dynamique par défaut

    private liveSimDebounce?: ReturnType<typeof setTimeout>;
    private readonly LIVE_DEBOUNCE_MS = 120; // Evite le recalcul à chauqe pixel glissé



    constructor(
        private circuitStore: CircuitStoreService,
        private vehicleStore: VehicleStoreService,
        private strategyStore: StrategyStoreService
    ) {
        this.cfg = this.strategyStore.get();
     }

    ngOnInit(): void {
        // ... ton init existant (lecture du store, etc.)

        // Premier rendu / premier calcul
        queueMicrotask(() => this.simulate(this.solver));
        // ou: setTimeout(() => this.runSimulation(this.solver), 0);
    }



    onIntervalsChange(intervals: Interval[]): void {
        this.strategyIntervals = intervals.map(i => ({ d: i.d, f: i.f }));
        this.cfg = { ...this.cfg, intervals: this.strategyIntervals };
        this.strategyStore.set(this.cfg);

        this.scheduleSimulationIfLive();
    }

    scheduleSimulationIfLive(): void {
        if (this.computeMode !== 'live') return;

        if (this.liveSimDebounce) clearTimeout(this.liveSimDebounce);
        this.liveSimDebounce = setTimeout(() => {
            this.simulate(this.solver);
        }, this.LIVE_DEBOUNCE_MS);
    }



    simulate(method: 'Euler' | 'RK4'): void {
        this.error = null;
        this.result = null;
        this.lastMethod = null;

        const circuitProfile = this.circuitStore.getCircuit();
        this.circuitProfile = circuitProfile;

        if (!circuitProfile) {
            this.error = 'Aucun circuit chargé. Va sur la page Circuit.';
            return;
        }

        const vehicleCfg = this.vehicleStore.get(); // à adapter à ton store existant
        const strategyCfg = this.strategyStore.get();


        const circuit = this.circuitStore.getCircuit();
        if (circuit) this.distanceMax = circuit.s[circuit.s.length - 1];
        this.strategyIntervals = strategyCfg.intervals ?? [];


        try {
            const circuit = new Circuit(circuitProfile);
            const motor = new Motor(vehicleCfg.motor);   // dépend de ton modèle de VehicleStore
            const vehicle = new Vehicle(vehicleCfg.vehicle, motor);

            const strategy = new IntervalStrategy(strategyCfg);

            const res =
                method === 'Euler'
                    ? simulateEulerIntervals(circuit, vehicle, strategy, this.dt, this.tMax)
                    : simulateRK4Intervals(circuit, vehicle, strategy, this.dt, this.tMax);

            this.result = res;
            this.lastMethod = method;
        } catch (e: any) {
            this.error = e?.message ?? 'Erreur simulation inconnue';
        }
    }

    get energyWh(): number | null {
        if (!this.result) return null;
        return this.result.totalEnergyJ / 3600;
    }

    private formatMmSs(totalSeconds: number): string {
        const s = Math.max(0, Math.floor(totalSeconds));
        const mm = Math.floor(s / 60);
        const ss = s % 60;
        return `${mm}:${ss.toString().padStart(2, '0')}`;
    }

    get totalTimeLabel(): string | null {
        if (!this.result) return null;
        const t = this.result.totalTime;
        return `${t.toFixed(1)} s (${this.formatMmSs(t)})`;
    }

    get vAvgLabel(): string | null {
        if (!this.result) return null;
        const v = this.result.vAvg;
        const kmh = v * 3.6;
        return `${v.toFixed(2)} m/s (${kmh.toFixed(1)} km/h)`;
    }


}