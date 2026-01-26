import { CommonModule } from '@angular/common';
import { Component, AfterViewInit, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';

import { Chart, ChartConfiguration, LineController, LineElement, PointElement,LinearScale,
    CategoryScale, Tooltip, Legend, Filler, Plugin
 } from 'chart.js';

 

type PointSV = { s: number; v: number };
type Interval = { d: number; f: number };


@Component({
  selector: 'app-dual-speed-altitude-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dual-speed-altitude-chart.component.html',
  styleUrl: './dual-speed-altitude-chart.component.css'
})



export class DualSpeedAltitudeChartComponent
    implements AfterViewInit, OnChanges, OnDestroy {
    @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;

    // --- API "compatible" avec les composants existants ---
    @Input() s: number[] = []; // profil: distance
    @Input() z: number[] = []; // profil: altitude

    @Input() points: PointSV[] = []; // simulation: (s,v) -> SimPoint[] compatible
    @Input() intervals: Interval[] = [];
    @Input() distanceMax: number | null = null; // si null => dernier point.s

    @Input() xMin: number | null = null;
    @Input() xMax: number | null = null;


    @Input() unit: 'mps' | 'kmh' = 'mps';

    @Input() title = 'Vitesse & altitude en fonction de la distance (m)';
    @Input() maxPoints = 1500;

    private chart: Chart<'line'> | null = null;
    private viewReady = false;

    // ----------- STYLE (identique à tes charts existants) -----------
    private readonly GRID_COLOR = '#b6b6b6ff';
    private readonly AXIS_COLOR = '#777777ff';
    private readonly AXIS_DASH: [number, number] = [4, 4];

    private readonly SPEED_COLOR = '#198754';   // vert Bootstrap
    private readonly ALT_COLOR = '#0249a5ff';   // bleu altitude

    // Bande stratégie (rouge translucide, "bootstrap danger-like")
    private readonly BAND_FILL = 'rgba(220, 53, 69, 0.15)';

    // ----------- Plugin bandes rouges (dessin dans le canvas) -----------
    private readonly bandsPlugin: Plugin<'line'> = {
        id: 'strategyBands',
        beforeDatasetsDraw: (chart) => {
            const { ctx, chartArea, scales } = chart;
            if (!chartArea) return;
            const x = scales['x'];
            if (!x) return;

            const max = this.getDistanceMax();
            if (!Number.isFinite(max) || max <= 0) return;

            const xmin = this.getXMin();
            const xmax = this.getXMax();


            ctx.save();
            ctx.fillStyle = this.BAND_FILL;

            const top = chartArea.top;
            const height = chartArea.bottom - chartArea.top;

            for (const iv of this.intervals ?? []) {
                const d = clamp(iv.d, xmin, xmax);
                const f = clamp(iv.f, xmin, xmax);

                const x1 = x.getPixelForValue(d);
                const x2 = x.getPixelForValue(f);

                const left = Math.min(x1, x2);
                const right = Math.max(x1, x2);

                const clippedLeft = Math.max(left, chartArea.left);
                const clippedRight = Math.min(right, chartArea.right);
                const w = Math.max(0, clippedRight - clippedLeft);

                if (w > 0) {
                    ctx.fillStyle = 'rgba(220, 53, 69, 0.15)'; // EXACT comme ton CSS .band :contentReference[oaicite:1]{index=1}
                    ctx.fillRect(clippedLeft, top, w, height);

                    // Optionnel : liseré comme .legend-swatch :contentReference[oaicite:2]{index=2}
                    ctx.strokeStyle = 'rgba(220, 53, 69, 0.25)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(clippedLeft, top, w, height);
                }
            }

            ctx.restore();
        },
    };

    // ---------------- Lifecycle ----------------

    ngAfterViewInit(): void {
        this.viewReady = true;
        this.render();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (!this.viewReady) return;
        if (
            changes['s'] ||
            changes['z'] ||
            changes['points'] ||
            changes['intervals'] ||
            changes['distanceMax'] ||
            changes['unit'] ||
            changes['title'] ||
            changes['maxPoints']
        ) {
            this.render();
        }
    }

    ngOnDestroy(): void {
        this.destroyChart();
    }

    // ---------------- Rendering ----------------

    private render(): void {
        if (!this.canvas?.nativeElement) return;

        // garde-fous
        if (!this.points?.length) return;
        if (!this.s?.length || !this.z?.length || this.s.length !== this.z.length) return;
        if (this.s.length < 2) return;

        // 1) Downsample des points de simu (comme SpeedChart)
        const { xs, vsMps } = this.downsampleSV(this.points, this.maxPoints);

        // 2) Vitesse: conversion éventuelle
        const speed = this.unit === 'kmh' ? vsMps.map(v => v * 3.6) : vsMps;
        const speedLabel = this.unit === 'kmh' ? 'Vitesse (km/h)' : 'Vitesse (m/s)';

        // 3) Altitude: interpolation du profil sur les distances simulées
        const altitude = this.interpolateZ(this.s, this.z, xs);

        const config: ChartConfiguration<'line'> = {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: this.unit === 'kmh' ? 'v (km/h)' : 'v (m/s)',
                        data: xs.map((x, i) => ({ x, y: speed[i] })),
                        yAxisID: 'ySpeed',
                        tension: 0.15,
                        pointRadius: 0,
                        borderColor: this.SPEED_COLOR,
                        borderWidth: 3,
                    },
                    {
                        label: 'Altitude (m)',
                        data: xs.map((x, i) => ({ x, y: altitude[i] })),
                        yAxisID: 'yAlt',
                        tension: 0.15,
                        pointRadius: 0,
                        borderColor: this.ALT_COLOR,
                        borderWidth: 3,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            title: (items) => {
                                const x = items?.[0]?.parsed?.x;
                                return typeof x === 'number' ? `Distance : ${Math.round(x)} m` : '';
                            },
                        },
                    },
                    title: { display: true, text: this.title },
                },
                scales: {
                    x: {
                        type: 'linear',
                        title: { display: true, text: 'Distance (m)' },
                        min: this.getXMin(),
                        max: this.getXMax(),
                        ticks: {
                            maxTicksLimit: 12,
                            callback: (value) => `${Math.round(Number(value))}`,
                        },
                        grid: {
                            color: this.GRID_COLOR,
                            lineWidth: 1,
                        },
                        border: {
                            color: this.AXIS_COLOR,
                            width: 2,
                            dash: this.AXIS_DASH,
                        },
                    },

                    // Axe vitesse à gauche
                    ySpeed: {
                        position: 'left',
                        title: { display: true, text: speedLabel },
                        ticks: { maxTicksLimit: 8 },
                        grid: {
                            color: this.GRID_COLOR,
                            lineWidth: 1,
                            drawOnChartArea: true,
                        },
                        border: {
                            color: this.AXIS_COLOR,
                            width: 2,
                            dash: this.AXIS_DASH,
                        },
                    },

                    // Axe altitude à droite (pas de double grille)
                    yAlt: {
                        position: 'right',
                        title: { display: true, text: 'Altitude (m)' },
                        ticks: { maxTicksLimit: 8 },
                        grid: {
                            color: this.GRID_COLOR,
                            lineWidth: 1,
                            drawOnChartArea: false,
                        },
                        border: {
                            color: this.AXIS_COLOR,
                            width: 2,
                            dash: this.AXIS_DASH,
                        },
                    },
                },
            },
            plugins: [this.bandsPlugin],
        };

        this.destroyChart();
        this.chart = new Chart(this.canvas.nativeElement, config);
    }

    private destroyChart(): void {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }

    // ---------------- Utils ----------------

    private downsampleSV(points: PointSV[], maxPoints: number): { xs: number[]; vsMps: number[] } {
        const n = points.length;
        if (n <= maxPoints) {
            return {
                xs: points.map(p => p.s),
                vsMps: points.map(p => p.v),
            };
        }

        const step = Math.ceil(n / maxPoints);
        const xs: number[] = [];
        const vsMps: number[] = [];

        for (let i = 0; i < n; i += step) {
            xs.push(points[i].s);
            vsMps.push(points[i].v);
        }

        const last = points[n - 1];
        if (xs[xs.length - 1] !== last.s) {
            xs.push(last.s);
            vsMps.push(last.v);
        }

        return { xs, vsMps };
    }

    /**
     * Interpolation linéaire de z(profile) sur les distances queryS.
     * Hypothèse: profileS croissant.
     */
    private interpolateZ(profileS: number[], profileZ: number[], queryS: number[]): number[] {
        const n = profileS.length;
        const out = new Array<number>(queryS.length);

        let j = 0;

        for (let i = 0; i < queryS.length; i++) {
            const s = queryS[i];

            if (s <= profileS[0]) { out[i] = profileZ[0]; continue; }
            if (s >= profileS[n - 1]) { out[i] = profileZ[n - 1]; continue; }

            while (j < n - 2 && profileS[j + 1] < s) j++;

            const s0 = profileS[j];
            const s1 = profileS[j + 1];
            const z0 = profileZ[j];
            const z1 = profileZ[j + 1];

            const denom = (s1 - s0);
            const t = denom !== 0 ? (s - s0) / denom : 0;
            out[i] = z0 + t * (z1 - z0);
        }

        return out;
    }

    private getDistanceMax(): number {
        if (this.distanceMax != null && Number.isFinite(this.distanceMax) && this.distanceMax > 0) {
            return this.distanceMax;
        }
        if (!this.points?.length) return 1;
        return Math.max(1, this.points[this.points.length - 1].s);
    }

    private getXMin(): number {
        if (this.xMin != null && Number.isFinite(this.xMin)) return this.xMin;
        return this.s?.length ? this.s[0] : 0;
    }

    private getXMax(): number {
        if (this.xMax != null && Number.isFinite(this.xMax)) return this.xMax;
        if (this.s?.length) return this.s[this.s.length - 1];
        return this.distanceMax != null ? this.distanceMax : 1;
    }

}

function clamp(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, v));
}