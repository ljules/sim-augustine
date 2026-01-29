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
import type { SimResult, StrategyConfig, Interval } from '../../domain/types';

import { SpeedChartComponent } from '../../shared/components/speed-chart/speed-chart.component';
import { AltitudeChartComponent } from '../../shared/components/altitude-chart/altitude-chart.component';
import { CurrentChartComponent } from '../../shared/components/current-chart/current-chart.component';
import { EnergyChartComponent } from '../../shared/components/energy-chart/energy-chart.component';
import { StrategyTimelineComponent } from "../../shared/components/strategy-timeline/strategy-timeline.component";
import { DualSpeedAltitudeChartComponent } from '../../shared/components/dual-speed-altitude-chart/dual-speed-altitude-chart.component';

type SolverMethod = 'Euler' | 'RK4';
type ComputeMode = 'live' | 'deferred';

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

  lastMethod: SolverMethod | null = null;
  result: SimResult | null = null;
  error: string | null = null;

  // ✅ Intervalles avec dtSlope (type domain)
  strategyIntervals: Interval[] = [];

  // ✅ Valeur par défaut (UI) pour les nouveaux intervalles
  defaultDtSlope = 0;

  speedUnit: 'mps' | 'kmh' = 'kmh';

  circuitProfile = this.circuitStore.getCircuit();

  distanceMax = 1000;

  cfg: StrategyConfig;
  strategy: StrategyConfig;

  solver: SolverMethod = "RK4";      // Valeur par défaut pour le calcul de la simulation.
  computeMode: ComputeMode = 'live'; // Mode dynamique par défaut

  private liveSimDebounce?: ReturnType<typeof setTimeout>;
  private readonly LIVE_DEBOUNCE_MS = 120; // Evite le recalcul à chauqe pixel glissé

  constructor(
    private circuitStore: CircuitStoreService,
    private vehicleStore: VehicleStoreService,
    private strategyStore: StrategyStoreService
  ) {
    // ✅ Charge et normalise immédiatement (rétro-compat)
    this.strategy = this.normalizeStrategy(this.strategyStore.get());
    this.strategyStore.set(this.strategy);

    this.cfg = this.strategy;

    // ✅ expose dans le composant
    this.defaultDtSlope = this.strategy.defaultDtSlope ?? 0;
    this.strategyIntervals = this.strategy.intervals ?? [];
  }

  ngOnInit(): void {
    // Premier rendu / premier calcul
    queueMicrotask(() => this.simulate(this.solver));
  }

  // ✅ Nouveau callback : changement du défaut (UI)
  onDefaultDtSlopeChange(v: number): void {
    const n = Number(v);
    const safe = Number.isFinite(n) ? Math.max(0, n) : 0;

    this.defaultDtSlope = safe;

    // On persiste dans la stratégie (facultatif mais utile)
    this.strategy = { ...this.strategy, defaultDtSlope: this.defaultDtSlope };
    this.cfg = this.strategy;
    this.strategyStore.set(this.strategy);

    this.scheduleSimulationIfLive();
  }

  // ✅ intervalsChange renvoie des Interval[] avec dtSlope
  onIntervalsChange(intervals: Interval[]): void {
    // Sécurise dtSlope si un interval arrive sans (par exemple import ancien)
    const nextIntervals = intervals.map(iv => ({
      d: iv.d,
      f: iv.f,
      dtSlope: iv.dtSlope ?? this.defaultDtSlope
    }));

    this.strategyIntervals = nextIntervals;

    this.strategy = { ...this.strategy, intervals: this.strategyIntervals };
    this.cfg = this.strategy;

    this.strategyStore.set(this.strategy);
    this.scheduleSimulationIfLive();
  }

  scheduleSimulationIfLive(): void {
    if (this.computeMode !== 'live') return;

    if (this.liveSimDebounce) clearTimeout(this.liveSimDebounce);
    this.liveSimDebounce = setTimeout(() => {
      this.simulate(this.solver);
    }, this.LIVE_DEBOUNCE_MS);
  }

  simulate(method: SolverMethod): void {
    this.error = null;
    this.result = null;
    this.lastMethod = null;

    const circuitProfile = this.circuitStore.getCircuit();
    this.circuitProfile = circuitProfile;

    if (!circuitProfile) {
      this.error = 'Aucun circuit chargé. Va sur la page Circuit.';
      return;
    }

    const vehicleCfg = this.vehicleStore.get();

    // ✅ Recharge + normalise depuis le store (au cas où)
    const strategyCfgRaw = this.strategyStore.get();
    const strategyCfg = this.normalizeStrategy(strategyCfgRaw);

    // si normalize a modifié quelque chose, on persiste
    if (strategyCfg !== strategyCfgRaw) this.strategyStore.set(strategyCfg);

    this.strategy = strategyCfg;
    this.cfg = strategyCfg;

    const circuit0 = this.circuitStore.getCircuit();
    if (circuit0) this.distanceMax = circuit0.s[circuit0.s.length - 1];

    this.defaultDtSlope = this.strategy.defaultDtSlope ?? 0;
    this.strategyIntervals = this.strategy.intervals ?? [];

    try {
      const circuit = new Circuit(circuitProfile);
      const motor = new Motor(vehicleCfg.motor);
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

  // ✅ Normalisation + rétro-compatibilité :
  // - assure defaultDtSlope
  // - assure dtSlope dans chaque interval
  private normalizeStrategy(cfg: StrategyConfig): StrategyConfig {
    const defaultDtSlope = cfg.defaultDtSlope ?? 0;

    const intervals = (cfg.intervals ?? []).map((iv: any) => ({
      d: iv.d,
      f: iv.f,
      dtSlope: iv.dtSlope ?? defaultDtSlope
    })) as Interval[];

    // Retourne un nouvel objet si on a modifié / complété
    // (simple, lisible)
    return {
      ...cfg,
      defaultDtSlope,
      intervals
    };
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
