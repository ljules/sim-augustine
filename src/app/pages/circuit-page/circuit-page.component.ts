import { Component } from '@angular/core';
import { CircuitStoreService } from '../../core/services/circuit-store.service';
import { CircuitCsvParserService } from '../../core/services/circuit-csv-parser.service';
import { CircuitProfile } from '../../domain/types';
import { CommonModule } from '@angular/common';
import { AltitudeChartComponent } from '../../shared/components/altitude-chart/altitude-chart.component';
import { GradeChartComponent } from '../../shared/components/grade-chart/grade-chart.component';
import { CircuitMapComponent } from '../../shared/components/circuit-map-component/circuit-map-component.component';
import { StrategyStoreService } from '../../core/services/strategy-store.service';
import type { StrategyConfig } from '../../domain/types';


@Component({
  selector: 'app-circuit-page',
  standalone: true,
  imports: [CommonModule, AltitudeChartComponent, GradeChartComponent, CircuitMapComponent],
  templateUrl: './circuit-page.component.html',
  styleUrl: './circuit-page.component.css'
})



export class CircuitPageComponent {
    circuit: CircuitProfile | null = null;
    strategyConfig: StrategyConfig;
    error: string | null = null;

    // Stats (calculées côté TS pour éviter Math.min/max dans le template)
    nbPoints: number | null = null;
    distanceMax: number | null = null;
    zMin: number | null = null;
    zMax: number | null = null;

    // Optionnel : nom “humain” si tu veux l’afficher même quand le fichier s’appelle autrement
    //defaultCircuitName = this.circuit?.name ?? 'Nom du fichier chargé...';

    // KPI
    gradeMinPct: number | null = null;
    gradeMaxPct: number | null = null;
    gradeAbsMeanPct: number | null = null; // moyenne de |pente|


    constructor(
        private parser: CircuitCsvParserService,
        private strategyStore: StrategyStoreService,
        private store: CircuitStoreService
    ) {
        const existing = this.store.getCircuit();
        if (existing) {
        this.setCircuit(existing);
        }

        this.strategyConfig = this.strategyStore.get();
    }

    async onFileSelected(ev: Event): Promise<void> {
        this.error = null;

        const input = ev.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        try {
        const profile = await this.parser.parseShellCsv(file);
        this.store.setCircuit(profile);
        this.setCircuit(profile);
        } catch (e: unknown) {
        this.error = e instanceof Error ? e.message : 'Erreur inconnue lors de la lecture du CSV.';
        this.circuit = null;
        this.clearStats();
        } finally {
        // Permet de re-sélectionner le même fichier (sinon change ne se déclenche pas)
        input.value = '';
        }
    }

    clear(): void {
        this.store.clear();
        this.circuit = null;
        this.error = null;
        this.clearStats();
    }

    // -------------------------
    // Helpers
    // -------------------------
    private setCircuit(c: CircuitProfile): void {
        this.circuit = c;
        this.computeStats(c);
    }

    private clearStats(): void {
        this.nbPoints = null;
        this.distanceMax = null;
        this.zMin = null;
        this.zMax = null;
        this.gradeMinPct = null;
        this.gradeMaxPct = null;
        this.gradeAbsMeanPct = null;

    }

    private computeStats(c: CircuitProfile): void {
        this.nbPoints = c.s.length;

        if (c.s.length > 0) {
        this.distanceMax = c.s[c.s.length - 1];
        } else {
        this.distanceMax = null;
        }

        // Min/Max altitude sans spread (plus sûr/perf)
        let min = Number.POSITIVE_INFINITY;
        let max = Number.NEGATIVE_INFINITY;

        for (const v of c.z) {
        if (v < min) min = v;
        if (v > max) max = v;
        }

        this.zMin = Number.isFinite(min) ? min : null;
        this.zMax = Number.isFinite(max) ? max : null;

        // ----- KPI PENTE (%)
        const gradeRaw = this.computeGradePct(c.s, c.z);

        // IMPORTANT : utiliser la même fenêtre que le graphe (ex: 9)
        const smoothWindow = 9;
        const grade = this.movingAverage(gradeRaw, smoothWindow);

        let gMin = Number.POSITIVE_INFINITY;
        let gMax = Number.NEGATIVE_INFINITY;
        let absSum = 0;
        let cnt = 0;

        for (const g of grade) {
        if (!Number.isFinite(g)) continue;
        if (g < gMin) gMin = g;
        if (g > gMax) gMax = g;
        absSum += Math.abs(g);
        cnt++;
        }

        this.gradeMinPct = Number.isFinite(gMin) ? gMin : null;
        this.gradeMaxPct = Number.isFinite(gMax) ? gMax : null;
        this.gradeAbsMeanPct = cnt > 0 ? absSum / cnt : null;

    }

    private computeGradePct(s: number[], z: number[]): number[] {
        const n = s.length;
        const out = new Array<number>(n).fill(0);

        out[0] = 100 * (z[1] - z[0]) / Math.max(1e-9, (s[1] - s[0]));

        for (let i = 1; i < n - 1; i++) {
            const ds = s[i + 1] - s[i - 1];
            out[i] = 100 * (z[i + 1] - z[i - 1]) / Math.max(1e-9, ds);
        }

        out[n - 1] = 100 * (z[n - 1] - z[n - 2]) / Math.max(1e-9, (s[n - 1] - s[n - 2]));

        for (let i = 0; i < n; i++) {
            if (!Number.isFinite(out[i])) out[i] = 0;
        }
        return out;
    }

    private normalizeOdd(v: number): number {
        if (!Number.isFinite(v) || v < 1) return 1;
        const iv = Math.floor(v);
        return iv % 2 === 1 ? iv : iv + 1;
    }

    private movingAverage(x: number[], window: number): number[] {
        const n = x.length;
        const out = new Array<number>(n).fill(0);
        const w = this.normalizeOdd(window);
        const half = Math.floor(w / 2);

        for (let i = 0; i < n; i++) {
            const a = Math.max(0, i - half);
            const b = Math.min(n - 1, i + half);
            let sum = 0;
            let cnt = 0;
            for (let k = a; k <= b; k++) {
            sum += x[k];
            cnt++;
            }
            out[i] = cnt > 0 ? sum / cnt : x[i];
        }
        return out;
    }

}