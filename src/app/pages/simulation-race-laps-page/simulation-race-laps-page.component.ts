import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CircuitStoreService } from '../../services/circuit-store.service';
import { RaceSessionStoreService } from '../../services/race-session-store.service';
import { VehicleStoreService } from '../../services/vehicle-store.service';

import { Circuit } from '../../domain/circuit/circuit';
import { Motor } from '../../domain/vehicle/motor';
import { Vehicle } from '../../domain/vehicle/vehicle';

import { IntervalStrategy } from '../../domain/strategy/interval-strategy';
import { simulateEulerIntervals, simulateRK4Intervals } from '../../domain/simulation/simulate-intervals';
import { getFinalSpeedKmh, getRemainingRaceLaps } from '../../domain/session/race-session';
import type { Interval, IntervalColor, RaceSessionConfig, SimResult, StrategyConfig } from '../../domain/types';

import { CurrentChartComponent } from '../../components/current-chart/current-chart.component';
import { EnergyChartComponent } from '../../components/energy-chart/energy-chart.component';
import { StrategyTimelineComponent } from '../../components/strategy-timeline/strategy-timeline.component';
import { DualSpeedAltitudeChartComponent } from '../../components/dual-speed-altitude-chart/dual-speed-altitude-chart.component';
import { PwmChartComponent } from '../../components/pwm-chart/pwm-chart.component';

type SolverMethod = 'Euler' | 'RK4';
type ComputeMode = 'live' | 'deferred';

@Component({
  selector: 'app-simulation-race-laps-page',
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
  templateUrl: './simulation-race-laps-page.component.html',
  styleUrl: './simulation-race-laps-page.component.css'
})
export class SimulationRaceLapsPageComponent {
  private readonly SPEED_TOLERANCE_KMH = 0.05;

  dt = 0.2;
  tMax = 400;
  vInitKmh = 0;

  lastMethod: SolverMethod | null = null;
  result: SimResult | null = null;
  error: string | null = null;

  strategyIntervals: Interval[] = [];
  defaultDtSlope = 0;
  defaultColor: IntervalColor = 'yellow';

  speedUnit: 'mps' | 'kmh' = 'kmh';

  circuitProfile = this.circuitStore.getCircuit();
  distanceMax = 1000;

  sessionConfig: RaceSessionConfig;
  cfg: StrategyConfig;
  strategy: StrategyConfig;

  totalLaps = 11;
  startLapFinalSpeedKmh: number | null = null;

  solver: SolverMethod = 'RK4';
  computeMode: ComputeMode = 'live';

  private liveSimDebounce?: ReturnType<typeof setTimeout>;
  private readonly LIVE_DEBOUNCE_MS = 120;

  constructor(
    private circuitStore: CircuitStoreService,
    private vehicleStore: VehicleStoreService,
    private raceSessionStore: RaceSessionStoreService
  ) {
    this.sessionConfig = this.raceSessionStore.get();
    this.totalLaps = Math.max(2, this.sessionConfig.totalLaps);
    this.strategy = this.normalizeStrategy(this.sessionConfig.raceLapStrategy);
    this.persistRaceLapConfig(this.strategy);

    this.cfg = this.strategy;
    this.vInitKmh = this.strategy.vInit ?? 0;

    this.defaultDtSlope = this.strategy.defaultDtSlope ?? 0;
    this.defaultColor = this.strategy.defaultColor ?? 'yellow';
    this.strategyIntervals = this.strategy.intervals ?? [];

    this.refreshStartLapFinalSpeed();
  }

  ngOnInit(): void {
    queueMicrotask(() => this.simulate(this.solver));
  }

  get remainingRaceLaps(): number {
    return getRemainingRaceLaps(this.totalLaps);
  }

  get hasStartLapResult(): boolean {
    return this.startLapFinalSpeedKmh !== null;
  }

  get isVInitConsistent(): boolean {
    if (this.startLapFinalSpeedKmh === null) return true;
    return Math.abs(this.vInitKmh - this.startLapFinalSpeedKmh) <= this.SPEED_TOLERANCE_KMH;
  }

  get expectedSpeedLabel(): string {
    if (this.startLapFinalSpeedKmh === null) return 'Non disponible';
    return `${this.startLapFinalSpeedKmh.toFixed(2)} km/h`;
  }

  onTotalLapsChange(v: number): void {
    const n = Number(v);
    const safe = Number.isFinite(n) ? Math.max(2, Math.floor(n)) : 2;
    if (safe === this.totalLaps) return;

    this.totalLaps = safe;
    this.persistRaceLapConfig(this.strategy);
  }

  copyStartLapSpeed(): void {
    if (this.startLapFinalSpeedKmh === null) return;
    this.onVInitKmhChange(this.startLapFinalSpeedKmh);
  }

  onDefaultDtSlopeChange(v: number): void {
    const n = Number(v);
    const safe = Number.isFinite(n) ? Math.max(0, n) : 0;

    if (safe === this.defaultDtSlope) return;
    this.defaultDtSlope = safe;

    this.strategy = { ...this.strategy, defaultDtSlope: this.defaultDtSlope };
    this.cfg = this.strategy;
    this.persistRaceLapConfig(this.strategy);

    this.scheduleSimulationIfLive();
  }

  onDefaultColorChange(color: IntervalColor): void {
    if (color === this.defaultColor) return;
    this.defaultColor = color;

    this.strategy = { ...this.strategy, defaultColor: this.defaultColor };
    this.cfg = this.strategy;
    this.persistRaceLapConfig(this.strategy);

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

    this.persistRaceLapConfig(this.strategy);
    this.scheduleSimulationIfLive();
  }

  onVInitKmhChange(v: number): void {
    const n = Number(v);
    const safe = Number.isFinite(n) ? Math.max(0, n) : 0;
    if (safe === this.vInitKmh) return;

    this.vInitKmh = safe;

    this.strategy = { ...this.strategy, vInit: this.vInitKmh };
    this.cfg = this.strategy;
    this.persistRaceLapConfig(this.strategy);

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
    this.refreshStartLapFinalSpeed();

    const circuitProfile = this.circuitStore.getCircuit();
    this.circuitProfile = circuitProfile;

    if (!circuitProfile) {
      this.error = 'Aucun circuit charge. Va sur la page Circuit.';
      this.raceSessionStore.setRaceLapResult(null);
      return;
    }

    const vehicleCfg = this.vehicleStore.get();

    this.sessionConfig = this.raceSessionStore.get();
    this.totalLaps = Math.max(2, this.sessionConfig.totalLaps);
    const strategyCfg = this.normalizeStrategy(this.sessionConfig.raceLapStrategy);
    this.persistRaceLapConfig(strategyCfg);

    this.strategy = strategyCfg;
    this.cfg = strategyCfg;

    this.vInitKmh = this.strategy.vInit ?? 0;
    this.defaultDtSlope = this.strategy.defaultDtSlope ?? 0;
    this.defaultColor = this.strategy.defaultColor ?? 'yellow';
    this.strategyIntervals = this.strategy.intervals ?? [];

    const circuit0 = this.circuitStore.getCircuit();
    if (circuit0) this.distanceMax = circuit0.s[circuit0.s.length - 1];

    try {
      const circuit = new Circuit(circuitProfile);
      const motor = new Motor(vehicleCfg.motor);
      const vehicle = new Vehicle(vehicleCfg.vehicle, motor);

      const strategy = new IntervalStrategy(strategyCfg);
      const vInitMps = (strategyCfg.vInit ?? 0) / 3.6;

      const res =
        method === 'Euler'
          ? simulateEulerIntervals(circuit, vehicle, strategy, this.dt, this.tMax, vInitMps)
          : simulateRK4Intervals(circuit, vehicle, strategy, this.dt, this.tMax, vInitMps);

      this.result = res;
      this.raceSessionStore.setRaceLapResult(res);
      this.lastMethod = method;
    } catch (e: any) {
      this.error = e?.message ?? 'Erreur simulation inconnue';
      this.raceSessionStore.setRaceLapResult(null);
    }
  }

  private refreshStartLapFinalSpeed(): void {
    this.startLapFinalSpeedKmh = getFinalSpeedKmh(this.raceSessionStore.getStartLapResult());
  }

  private persistRaceLapConfig(strategy: StrategyConfig): void {
    this.sessionConfig = {
      ...this.raceSessionStore.get(),
      totalLaps: this.totalLaps,
      raceLapStrategy: strategy,
    };
    this.raceSessionStore.set(this.sessionConfig);
  }

  private normalizeStrategy(cfg: StrategyConfig): StrategyConfig {
    const defaultDtSlope = cfg.defaultDtSlope ?? 0;
    const defaultColor = this.safeColor(cfg.defaultColor, 'yellow');

    const intervals: Interval[] = (cfg.intervals ?? []).map((iv: any) => ({
      d: iv.d,
      f: iv.f,
      dtSlope: iv.dtSlope ?? defaultDtSlope,
      color: this.safeColor(iv.color, defaultColor),
    }));

    const vInit = Number.isFinite(Number(cfg.vInit)) ? Math.max(0, Number(cfg.vInit)) : 0;

    return {
      ...cfg,
      vInit,
      defaultDtSlope,
      defaultColor,
      intervals,
    };
  }

  private safeColor(raw: any, fallback: IntervalColor): IntervalColor {
    if (raw === 'red') return 'green';
    return raw === 'yellow' || raw === 'green' || raw === 'blue' ? raw : fallback;
  }

  get energyWh(): number | null {
    if (!this.result) return null;
    return this.result.totalEnergyJ / 3600;
  }

  get sessionTotalTime(): number | null {
    const startLapResult = this.raceSessionStore.getStartLapResult();
    if (!startLapResult || !this.result) return null;
    return startLapResult.totalTime + this.remainingRaceLaps * this.result.totalTime;
  }

  get sessionTotalDistanceKm(): number | null {
    const startLapResult = this.raceSessionStore.getStartLapResult();
    if (!startLapResult || !this.result) return null;
    const totalDistanceM = startLapResult.totalDistance + this.remainingRaceLaps * this.result.totalDistance;
    return totalDistanceM / 1000;
  }

  get sessionAvgSpeedKmh(): number | null {
    const startLapResult = this.raceSessionStore.getStartLapResult();
    if (!startLapResult || !this.result) return null;

    const totalTime = startLapResult.totalTime + this.remainingRaceLaps * this.result.totalTime;
    if (totalTime <= 0) return null;

    const totalDistanceM = startLapResult.totalDistance + this.remainingRaceLaps * this.result.totalDistance;
    return (totalDistanceM / totalTime) * 3.6;
  }

  get sessionTotalEnergyJ(): number | null {
    const startLapResult = this.raceSessionStore.getStartLapResult();
    if (!startLapResult || !this.result) return null;
    return startLapResult.totalEnergyJ + this.remainingRaceLaps * this.result.totalEnergyJ;
  }

  get sessionTotalTimeLabel(): string {
    if (this.sessionTotalTime === null) return '-';
    return this.formatMmSsTenths(this.sessionTotalTime);
  }

  private formatMmSs(totalSeconds: number): string {
    const s = Math.max(0, Math.floor(totalSeconds));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${mm}:${ss.toString().padStart(2, '0')}`;
  }

  private formatMmSsTenths(totalSeconds: number): string {
    const safe = Math.max(0, totalSeconds);
    const mm = Math.floor(safe / 60);
    const ss = safe - mm * 60;
    return `${mm}:${ss.toFixed(0).padStart(2, '0')}`;
  }

  get totalTimeLabel(): string | null {
    if (!this.result) return null;
    const t = this.result.totalTime;
    return `${this.formatMmSs(t)} (${t.toFixed(0)} s)`;
  }

  get vAvgLabel(): string | null {
    if (!this.result) return null;
    const v = this.result.vAvg;
    const kmh = v * 3.6;
    return `${kmh.toFixed(1)} km/h (${v.toFixed(2)} m/s)`;
  }
}
