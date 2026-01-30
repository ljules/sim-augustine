import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { StrategyStoreService } from '../../core/services/strategy-store.service';
import { CircuitStoreService } from '../../core/services/circuit-store.service';
import { StrategyConfig } from '../../domain/types';

import type { CircuitProfile, SimResult, SimPoint } from '../../domain/types';
import { CircuitMapComponent } from '../../shared/components/circuit-map-component/circuit-map-component.component';


// Type interne pour le tableau :
type PilotRow = {
  startTime: number;     // s
  endTime: number;       // s
  startSpeedKmh: number; // km/h
  endSpeedKmh: number;   // km/h
  color: string;         // IntervalColor
};


@Component({
    selector: 'app-strategy-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        CircuitMapComponent,],
    templateUrl: './strategy-page.component.html',
    styleUrl: './strategy-page.component.css'
})


export class StrategyPageComponent {
    distanceMax = 1000;
    cfg: StrategyConfig;
    circuit: CircuitProfile | null = null;
    simResult: SimResult | null = null;
    points: SimPoint[] = [];


 constructor(
  private strategyStore: StrategyStoreService,
  private circuitStore: CircuitStoreService
) {
  this.cfg = this.strategyStore.get();

  const circuit = this.circuitStore.getCircuit();
  if (circuit) {
    this.circuit = circuit;
    this.distanceMax = circuit.s[circuit.s.length - 1];
  }

  // Branche les résultats de simulation
  this.simResult = this.strategyStore.getSimResult();

  if (this.simResult) {
    this.points = this.simResult.points;
    this.samples = this.points.map(p => ({ t: p.t, s: p.s }));

    // Clamp currentT si besoin
    this.currentT = Math.max(0, Math.min(this.currentT, this.durationT));
  } else {
    // Option: garder vide ou mettre un petit jeu de test (je laisse vide)
    this.samples = [];
  }

  if (this.simResult && this.simResult.points.length === 0) {
    this.simResult = null;
    }

}


    // Temps courant de la "lecture" (en secondes)
    currentT = 0;

    // Résultats de simulation : à remplacer par ta vraie source (service, resolver, input...)
    samples: Array<{ t: number; s: number }> = [];


    playbackRate = 1;                // 1x par défaut
    playbackRates = [0.5, 1, 2, 4];  // options (tu peux enlever 0.5 si tu veux)




    // Durée totale
    get durationT(): number {
        if (this.simResult) return this.simResult.totalTime;
        return this.samples.length ? this.samples[this.samples.length - 1].t : 0;
    }


    // Distance courante à envoyer à la carte
    get currentS(): number {
        if (!this.samples.length) return 0;
        const idx = this.findIndexByTime(this.currentT);
        return this.samples[idx].s;
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

    formatMmSs(seconds: number): string {
        const s = Math.max(0, Math.floor(seconds));
        const mm = Math.floor(s / 60);
        const ss = s % 60;
        return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    }

    get durationTForUi(): number {
        // si on n'a pas encore de samples, on met un slider de test 0..60s
        return this.durationT > 0 ? this.durationT : 60;
    }

    onTimeSliderInput(value: string): void {
        this.pause();
        this.currentT = Number(value);
    }


    // --- Animation state ---
    isPlaying = false;
    private rafId: number | null = null;
    private lastTsMs: number | null = null;

    play(): void {
        if (this.isPlaying) return;
        if (this.durationTForUi <= 0) return;

        // si on est déjà à la fin, on repart du début
        if (this.currentT >= this.durationTForUi) this.currentT = 0;

        this.isPlaying = true;
        this.lastTsMs = null;

        const tick = (tsMs: number) => {
            if (!this.isPlaying) return;

            if (this.lastTsMs === null) this.lastTsMs = tsMs;
            const dt = (tsMs - this.lastTsMs) / 1000; // secondes
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
        const p = this.currentPoint as any;
        if (!p) return null;

        const v = Number(p.v);
        if (!Number.isFinite(v)) return null;

        return v * 3.6;
    }

    get currentPwmPercent(): number | null {
        const p = this.currentPoint as any;
        if (!p) return null;

        const raw = Number(p.pwm);
        if (!Number.isFinite(raw)) return null;

        // si déjà en %
        const percent = raw > 1.0001 ? raw : raw * 100;

        return Math.max(0, Math.min(100, percent));
    }

    get slopeLegend(): Array<{ color: string; dtSlope: number }> {
        const seen = new Map<string, number>();

        for (const iv of this.cfg.intervals) {
            if (!seen.has(iv.color)) {
                seen.set(iv.color, iv.dtSlope);
            }
        }

        return Array.from(seen.entries()).map(([color, dtSlope]) => ({
            color,
            dtSlope,
        }));
    }

    get pilotRows(): PilotRow[] {
        if (!this.simResult || !this.points.length) return [];

        const intervals = [...this.cfg.intervals].sort((a, b) => a.d - b.d);

        return intervals.map(iv => {
            const a = this.sampleAtDistance(iv.d);
            const b = this.sampleAtDistance(iv.f);

            return {
            startTime: a.t,
            endTime: b.t,
            startSpeedKmh: a.v * 3.6,
            endSpeedKmh: b.v * 3.6,
            color: iv.color,
            };
        });
    }


    // UTILITAIRES :
    // -----------------------

    private clamp01(x: number): number {
        return Math.max(0, Math.min(1, x));
    }

    private lowerBoundByDistance(targetS: number): number {
        // points triés par s croissant
        let lo = 0;
        let hi = this.points.length - 1;

        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (this.points[mid].s < targetS) lo = mid + 1;
            else hi = mid - 1;
        }
        return lo; // premier index i tel que points[i].s >= targetS
    }

    private sampleAtDistance(targetS: number): Pick<SimPoint, 't' | 'v'> {
        // fallback safe
        if (!this.points.length) return { t: 0, v: 0 };

        const first = this.points[0];
        const last = this.points[this.points.length - 1];

        if (targetS <= first.s) return { t: first.t, v: first.v };
        if (targetS >= last.s) return { t: last.t, v: last.v };

        const i = this.lowerBoundByDistance(targetS);

        if (i <= 0) return { t: first.t, v: first.v };
        if (i >= this.points.length) return { t: last.t, v: last.v };

        const p0 = this.points[i - 1];
        const p1 = this.points[i];

        const ds = p1.s - p0.s;
        if (Math.abs(ds) < 1e-9) return { t: p1.t, v: p1.v };

        const a = this.clamp01((targetS - p0.s) / ds);

        return {
            t: p0.t + (p1.t - p0.t) * a,
            v: p0.v + (p1.v - p0.v) * a,
        };
    }


}




