import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CircuitStoreService } from '../../services/circuit-store.service';
import { StrategyStoreService } from '../../services/strategy-store.service';
import { VehicleStoreService } from '../../services/vehicle-store.service';

import { Circuit } from '../../domain/circuit/circuit';
import { Motor } from '../../domain/vehicle/motor';
import { Vehicle } from '../../domain/vehicle/vehicle';

import { IntervalStrategy } from '../../domain/strategy/interval-strategy';
import { simulateEulerIntervals, simulateRK4Intervals } from '../../domain/simulation/simulate-intervals';
import type { SimResult, StrategyConfig, Interval, IntervalColor } from '../../domain/types';

import { CurrentChartComponent } from '../../components/current-chart/current-chart.component';
import { EnergyChartComponent } from '../../components/energy-chart/energy-chart.component';
import { StrategyTimelineComponent } from '../../components/strategy-timeline/strategy-timeline.component';
import { DualSpeedAltitudeChartComponent } from '../../components/dual-speed-altitude-chart/dual-speed-altitude-chart.component';
import { PwmChartComponent } from '../../components/pwm-chart/pwm-chart.component';

type SolverMethod = 'Euler' | 'RK4';
type ComputeMode = 'live' | 'deferred';

@Component({
  selector: 'app-simulation-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrentChartComponent,
    EnergyChartComponent,
    StrategyTimelineComponent,
    DualSpeedAltitudeChartComponent,
    PwmChartComponent,
  ],
  templateUrl: './simulation-page.component.html',
  styleUrl: './simulation-page.component.css',
})
export class SimulationPageComponent {
  dt = 0.2;
  tMax = 400;

  lastMethod: SolverMethod | null = null;
  result: SimResult | null = null;
  error: string | null = null;

  // Intervalles avec dtSlope + color (type domain)
  strategyIntervals: Interval[] = [];

  // Valeurs par défaut (UI) pour les nouveaux intervalles
  defaultDtSlope = 0;
  defaultColor: IntervalColor = 'yellow';

  speedUnit: 'mps' | 'kmh' = 'kmh';

  circuitProfile = this.circuitStore.getCircuit();
  distanceMax = 1000;

  cfg: StrategyConfig;
  strategy: StrategyConfig;

  solver: SolverMethod = 'RK4';        // Valeur par défaut pour le calcul de la simulation.
  computeMode: ComputeMode = 'live';   // Mode dynamique par défaut

  private liveSimDebounce?: ReturnType<typeof setTimeout>;
  private readonly LIVE_DEBOUNCE_MS = 120; // Evite le recalcul à chaque pixel glissé

  constructor(
    private circuitStore: CircuitStoreService,
    private vehicleStore: VehicleStoreService,
    private strategyStore: StrategyStoreService
  ) {
    // Charge et normalise immédiatement (rétro-compat)
    this.strategy = this.normalizeStrategy(this.strategyStore.get());
    this.strategyStore.set(this.strategy);

    this.cfg = this.strategy;

    // Expose dans le composant
    this.defaultDtSlope = this.strategy.defaultDtSlope ?? 0;
    this.defaultColor = this.strategy.defaultColor ?? 'yellow';
    this.strategyIntervals = this.strategy.intervals ?? [];
  }

  ngOnInit(): void {
    // Premier rendu / premier calcul
    queueMicrotask(() => this.simulate(this.solver));
  }

  // ----- Callbacks UI (enfant -> parent) -----

  onDefaultDtSlopeChange(v: number): void {
    const n = Number(v);
    const safe = Number.isFinite(n) ? Math.max(0, n) : 0;

    if (safe === this.defaultDtSlope) return;
    this.defaultDtSlope = safe;

    // Persistance dans la stratégie
    this.strategy = { ...this.strategy, defaultDtSlope: this.defaultDtSlope };
    this.cfg = this.strategy;
    this.strategyStore.set(this.strategy);

    this.scheduleSimulationIfLive();
  }

  onDefaultColorChange(color: IntervalColor): void {
    if (color === this.defaultColor) return;
    this.defaultColor = color;

    // Persistance dans la stratégie
    this.strategy = { ...this.strategy, defaultColor: this.defaultColor };
    this.cfg = this.strategy;
    this.strategyStore.set(this.strategy);

    this.scheduleSimulationIfLive();
  }

  onIntervalsChange(intervals: Interval[]): void {
    const nextIntervals: Interval[] = intervals.map(iv => ({
      d: iv.d,
      f: iv.f,
      dtSlope: iv.dtSlope ?? this.defaultDtSlope,
      color: iv.color ?? this.defaultColor,
    }));

    this.strategyIntervals = nextIntervals;

    this.strategy = { ...this.strategy, intervals: this.strategyIntervals };
    this.cfg = this.strategy;

    this.strategyStore.set(this.strategy);
    this.scheduleSimulationIfLive();
  }

  // ----- Debounce live -----

  scheduleSimulationIfLive(): void {
    if (this.computeMode !== 'live') return;

    if (this.liveSimDebounce) clearTimeout(this.liveSimDebounce);
    this.liveSimDebounce = setTimeout(() => {
      this.simulate(this.solver);
    }, this.LIVE_DEBOUNCE_MS);
  }

  // ----- Simulation -----

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

    // Recharge + normalise depuis le store (au cas où)
    const strategyCfgRaw = this.strategyStore.get();
    const strategyCfg = this.normalizeStrategy(strategyCfgRaw);

    // Si normalize a modifié quelque chose, on persiste
    if (strategyCfg !== strategyCfgRaw) this.strategyStore.set(strategyCfg);

    // Met à jour l'état local
    this.strategy = strategyCfg;
    this.cfg = strategyCfg;

    this.defaultDtSlope = this.strategy.defaultDtSlope ?? 0;
    this.defaultColor = this.strategy.defaultColor ?? 'yellow';
    this.strategyIntervals = this.strategy.intervals ?? [];

    // Distance max pour les composants (arrondi éventuel côté graph)
    const circuit0 = this.circuitStore.getCircuit();
    if (circuit0) this.distanceMax = circuit0.s[circuit0.s.length - 1];

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
      this.strategyStore.setSimResult(res);
      this.lastMethod = method;
    } catch (e: any) {
      this.error = e?.message ?? 'Erreur simulation inconnue';
       this.strategyStore.setSimResult(null as any);
    }
  }

  // ----- Normalisation / rétro-compat -----

  private normalizeStrategy(cfg: StrategyConfig): StrategyConfig {
    const defaultDtSlope = cfg.defaultDtSlope ?? 0;
    const defaultColor = this.safeColor(cfg.defaultColor, 'yellow');

    const intervals: Interval[] = (cfg.intervals ?? []).map((iv: any) => ({
      d: iv.d,
      f: iv.f,
      dtSlope: iv.dtSlope ?? defaultDtSlope,
      color: this.safeColor(iv.color, defaultColor),
    }));

    return {
      ...cfg,
      defaultDtSlope,
      defaultColor,
      intervals,
    };
  }

  private safeColor(raw: any, fallback: IntervalColor): IntervalColor {
    return raw === 'yellow' || raw === 'red' || raw === 'blue' ? raw : fallback;
  }

  // ----- Helpers UI -----

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
    return `${this.formatMmSs(t)} (${t.toFixed(1)} s)`;
  }

  get vAvgLabel(): string | null {
    if (!this.result) return null;
    const v = this.result.vAvg;
    const kmh = v * 3.6;
    return `${kmh.toFixed(1)} km/h (${v.toFixed(2)} m/s)`;
  }
}
