import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { StrategyStoreService } from '../../services/strategy-store.service';
import { CircuitStoreService } from '../../services/circuit-store.service';
import { RaceSessionStoreService } from '../../services/race-session-store.service';
import { ExportPayloadBuilderService } from '../../services/export-payload-builder.service';

import type { CircuitProfile, RaceSessionConfig, SimPoint, SimResult, StrategyConfig } from '../../domain/types';
import { getRemainingRaceLaps } from '../../domain/session/race-session';
import { CircuitMapComponent } from '../../components/circuit-map-component/circuit-map-component.component';

type PilotRow = {
  lapNo: number;
  startTime: number;
  endTime: number;
  startSpeedKmh: number;
  endSpeedKmh: number;
  color: string;
};

@Component({
  selector: 'app-strategy-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CircuitMapComponent,
  ],
  templateUrl: './strategy-page.component.html',
  styleUrl: './strategy-page.component.css'
})
export class StrategyPageComponent {
  distanceMax = 1000;
  sessionConfig: RaceSessionConfig;
  circuit: CircuitProfile | null = null;

  startLapResult: SimResult | null = null;
  raceLapResult: SimResult | null = null;

  // Animation simple : elle reste centree sur le tour de depart.
  points: SimPoint[] = [];
  samples: Array<{ t: number; s: number }> = [];
  currentT = 0;

  readonly pilotBadges = [
    'JapanClem.png',
    'PrincessClem.png',
    'PsykéClem.png',
    'GameClem.png',
    'ClemWarhol.png',
    'HastaLaVistaClem.png',
    'ClemPotter.png',
    'ClemToTheFuture.png',
  ] as const;

  pilotBadgeFile: string | null = null;

  playbackRate = 1;
  playbackRates = [0.5, 1, 2, 4];

  isPlaying = false;
  private rafId: number | null = null;
  private lastTsMs: number | null = null;

  exportPreviewJson: string | null = null;
  exportPreviewError: string | null = null;

  constructor(
    private strategyStore: StrategyStoreService,
    private circuitStore: CircuitStoreService,
    private raceSessionStore: RaceSessionStoreService,
    private exportPayloadBuilder: ExportPayloadBuilderService
  ) {
    this.sessionConfig = this.raceSessionStore.get();
    this.pilotBadgeFile = this.strategyStore.getPilotBadge();

    const circuit = this.circuitStore.getCircuit();
    if (circuit) {
      this.circuit = circuit;
      this.distanceMax = circuit.s[circuit.s.length - 1];
    }

    this.startLapResult = this.raceSessionStore.getStartLapResult();
    this.raceLapResult = this.raceSessionStore.getRaceLapResult();

    if (this.startLapResult?.points.length) {
      this.points = this.startLapResult.points;
      this.samples = this.points.map(p => ({ t: p.t, s: p.s }));
      this.currentT = Math.max(0, Math.min(this.currentT, this.durationT));
    }
  }

  get totalLaps(): number {
    return this.sessionConfig.totalLaps;
  }

  get remainingRaceLaps(): number {
    return getRemainingRaceLaps(this.totalLaps);
  }

  get hasSessionResults(): boolean {
    return !!this.startLapResult && !!this.raceLapResult;
  }

  get startLapStrategy(): StrategyConfig {
    return this.sessionConfig.startLapStrategy;
  }

  get raceLapStrategy(): StrategyConfig {
    return this.sessionConfig.raceLapStrategy;
  }

  get durationT(): number {
    if (this.startLapResult) return this.startLapResult.totalTime;
    return this.samples.length ? this.samples[this.samples.length - 1].t : 0;
  }

  get durationTForUi(): number {
    return this.durationT > 0 ? this.durationT : 60;
  }

  get currentS(): number {
    if (!this.samples.length) return 0;
    const idx = this.findIndexByTime(this.currentT);
    return this.samples[idx].s;
  }

  get currentIndex(): number {
    if (!this.samples.length) return 0;
    return this.findIndexByTime(this.currentT);
  }

  get currentPoint(): SimPoint | null {
    if (!this.points.length) return null;
    const i = this.currentIndex;
    return this.points[i] ?? null;
  }

  get currentSpeedKmh(): number | null {
    const p = this.currentPoint;
    if (!p) return null;

    const v = Number(p.v);
    if (!Number.isFinite(v)) return null;

    return v * 3.6;
  }

  get currentPwmPercent(): number | null {
    const p = this.currentPoint;
    if (!p) return null;

    const raw = Number(p.pwm);
    if (!Number.isFinite(raw)) return null;

    const percent = raw > 1.0001 ? raw : raw * 100;
    return Math.max(0, Math.min(100, percent));
  }

  get sessionTotalTime(): number | null {
    if (!this.startLapResult || !this.raceLapResult) return null;
    return this.startLapResult.totalTime + this.remainingRaceLaps * this.raceLapResult.totalTime;
  }

  get sessionTotalDistance(): number | null {
    if (!this.startLapResult || !this.raceLapResult) return null;
    return this.startLapResult.totalDistance + this.remainingRaceLaps * this.raceLapResult.totalDistance;
  }

  get sessionTotalEnergyJ(): number | null {
    if (!this.startLapResult || !this.raceLapResult) return null;
    return this.startLapResult.totalEnergyJ + this.remainingRaceLaps * this.raceLapResult.totalEnergyJ;
  }

  get sessionAvgSpeedKmh(): number | null {
    const totalTime = this.sessionTotalTime;
    const totalDistance = this.sessionTotalDistance;
    if (totalTime === null || totalDistance === null || totalTime <= 0) return null;
    return (totalDistance / totalTime) * 3.6;
  }

  get sessionTotalTimeLabel(): string {
    if (this.sessionTotalTime === null) return '-';
    return `${this.formatMmSs(this.sessionTotalTime)} (${this.sessionTotalTime.toFixed(1)} s)`;
  }

  get sessionDistanceKm(): number | null {
    if (this.sessionTotalDistance === null) return null;
    return this.sessionTotalDistance / 1000;
  }

  get startPilotRows(): PilotRow[] {
    return this.buildPilotRows(this.startLapStrategy, this.startLapResult, 1, 0);
  }

  get racePilotRows(): PilotRow[] {
    return this.buildPilotRows(this.raceLapStrategy, this.raceLapResult, 2, this.startLapResult?.totalTime ?? 0);
  }

  get sessionPilotRows(): PilotRow[] {
    if (!this.startLapResult || !this.raceLapResult) return [];

    const rows = [
      ...this.buildPilotRows(this.startLapStrategy, this.startLapResult, 1, 0),
    ];

    const firstRaceLapStartTime = this.startLapResult.totalTime;

    for (let lapNo = 2; lapNo <= this.totalLaps; lapNo++) {
      const lapStartTime = firstRaceLapStartTime + (lapNo - 2) * this.raceLapResult.totalTime;
      rows.push(...this.buildPilotRows(this.raceLapStrategy, this.raceLapResult, lapNo, lapStartTime));
    }

    return rows;
  }

  get startSlopeLegend(): Array<{ color: string; dtSlope: number }> {
    return this.slopeLegendFor(this.startLapStrategy);
  }

  get raceSlopeLegend(): Array<{ color: string; dtSlope: number }> {
    return this.slopeLegendFor(this.raceLapStrategy);
  }

  get pilotBadgeUrl(): string | null {
    return this.pilotBadgeFile
      ? `assets/img/badges-pilote/${this.pilotBadgeFile}`
      : null;
  }

  onPilotBadgeChange(fileName: string | null): void {
    this.pilotBadgeFile = fileName;
    this.strategyStore.setPilotBadge(fileName);
    this.lastTsMs = null;
  }

  previewExportJson(): void {
    this.exportPreviewJson = null;
    this.exportPreviewError = null;

    if (!this.circuit) {
      this.exportPreviewError = 'Export impossible : aucun circuit chargé.';
      return;
    }

    if (!this.startLapResult) {
      this.exportPreviewError = 'Export impossible : lance d abord la simulation du tour de départ.';
      return;
    }

    if (!this.raceLapResult) {
      this.exportPreviewError = 'Export impossible : lance d abord la simulation des tours suivants.';
      return;
    }

    try {
      const payload = this.exportPayloadBuilder.buildFromCurrentState();
      this.exportPreviewJson = JSON.stringify(payload, null, 2);
    } catch (e: any) {
      this.exportPreviewError = e?.message ?? 'Export impossible : erreur inconnue.';
    }
  }

  closeExportPreview(): void {
    this.exportPreviewJson = null;
    this.exportPreviewError = null;
  }

  onTimeSliderInput(value: string): void {
    this.pause();
    this.currentT = Number(value);
  }

  play(): void {
    if (this.isPlaying) return;
    if (this.durationTForUi <= 0) return;

    if (this.currentT >= this.durationTForUi) this.currentT = 0;

    this.isPlaying = true;
    this.lastTsMs = null;

    const tick = (tsMs: number) => {
      if (!this.isPlaying) return;

      if (this.lastTsMs === null) this.lastTsMs = tsMs;
      const dt = (tsMs - this.lastTsMs) / 1000;
      this.lastTsMs = tsMs;

      this.currentT += dt * this.playbackRate;

      if (this.currentT >= this.durationTForUi) {
        this.currentT = this.durationTForUi;
        this.pause();
        return;
      }

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  pause(): void {
    this.isPlaying = false;
    this.lastTsMs = null;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  seekStart(): void {
    this.pause();
    this.currentT = 0;
  }

  seekEnd(): void {
    this.pause();
    this.currentT = this.durationTForUi;
  }

  formatMmSs(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }

  private findIndexByTime(t: number): number {
    const a = this.samples;
    let lo = 0;
    let hi = a.length - 1;

    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (a[mid].t < t) lo = mid + 1;
      else hi = mid - 1;
    }

    if (lo <= 0) return 0;
    if (lo >= a.length) return a.length - 1;

    const i0 = lo - 1;
    const i1 = lo;
    return (t - a[i0].t <= a[i1].t - t) ? i0 : i1;
  }

  private slopeLegendFor(strategy: StrategyConfig): Array<{ color: string; dtSlope: number }> {
    const seen = new Map<string, number>();

    for (const iv of strategy.intervals) {
      if (!seen.has(iv.color)) {
        seen.set(iv.color, iv.dtSlope);
      }
    }

    return Array.from(seen.entries()).map(([color, dtSlope]) => ({
      color,
      dtSlope,
    }));
  }

  private buildPilotRows(
    strategy: StrategyConfig,
    result: SimResult | null,
    lapNo: number,
    lapStartTime: number
  ): PilotRow[] {
    if (!result || !result.points.length) return [];

    const intervals = [...strategy.intervals].sort((a, b) => a.d - b.d);

    return intervals.map(iv => {
      const a = this.sampleAtDistance(result.points, iv.d);
      const b = this.sampleAtDistance(result.points, iv.f);

      return {
        lapNo,
        startTime: lapStartTime + a.t,
        endTime: lapStartTime + b.t,
        startSpeedKmh: a.v * 3.6,
        endSpeedKmh: b.v * 3.6,
        color: iv.color,
      };
    });
  }

  private clamp01(x: number): number {
    return Math.max(0, Math.min(1, x));
  }

  private lowerBoundByDistance(points: SimPoint[], targetS: number): number {
    let lo = 0;
    let hi = points.length - 1;

    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (points[mid].s < targetS) lo = mid + 1;
      else hi = mid - 1;
    }
    return lo;
  }

  private sampleAtDistance(points: SimPoint[], targetS: number): Pick<SimPoint, 't' | 'v'> {
    if (!points.length) return { t: 0, v: 0 };

    const first = points[0];
    const last = points[points.length - 1];

    if (targetS <= first.s) return { t: first.t, v: first.v };
    if (targetS >= last.s) return { t: last.t, v: last.v };

    const i = this.lowerBoundByDistance(points, targetS);

    if (i <= 0) return { t: first.t, v: first.v };
    if (i >= points.length) return { t: last.t, v: last.v };

    const p0 = points[i - 1];
    const p1 = points[i];

    const ds = p1.s - p0.s;
    if (Math.abs(ds) < 1e-9) return { t: p1.t, v: p1.v };

    const a = this.clamp01((targetS - p0.s) / ds);

    return {
      t: p0.t + (p1.t - p0.t) * a,
      v: p0.v + (p1.v - p0.v) * a,
    };
  }
}
