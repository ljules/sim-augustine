import { CommonModule } from '@angular/common';
import {
    AfterViewInit,
    Component,
    ElementRef,
    Input,
    OnChanges,
    OnDestroy,
    SimpleChanges,
    ViewChild,
} from '@angular/core';

import {
    Chart,
    ChartConfiguration,
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Tooltip,
    Legend,
} from 'chart.js';

Chart.register(
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Tooltip,
    Legend
);

type PointSV = { s: number; v: number };
type Interval = { d: number; f: number };

@Component({
    selector: 'app-speed-chart',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './speed-chart.component.html',
    styleUrl: './speed-chart.component.css'
})



export class SpeedChartComponent
    implements AfterViewInit, OnChanges, OnDestroy {

    @ViewChild('canvas', { static: true })
    canvas!: ElementRef<HTMLCanvasElement>;

    @Input() points: PointSV[] = [];
    @Input() title = 'Vitesse (m/s) en fonction de la distance (m)';
    @Input() maxPoints = 1500;
    @Input() intervals: Interval[] = [];
    @Input() distanceMax: number | null = null; // si null => prend le dernier point.s
    @Input() unit: 'mps' | 'kmh' = 'mps';


    private chart: Chart | null = null;
    private viewReady = false;

    plotTop = 0;
    plotHeight = 0;
    plotLeft = 0;
    plotWidth = 0;



    // ---------------- Lifecycle ----------------

    ngAfterViewInit(): void {
        this.viewReady = true;
        this.render();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (!this.viewReady) return;
        if (
            changes['points'] ||
            changes['title'] ||
            changes['maxPoints'] ||
            changes['unit'] ||
            changes['intervals'] ||
            changes['distanceMax']
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
        if (!this.points || this.points.length === 0) return;

        const { xs, ys: ysMps } = this.downsampleSV(this.points, this.maxPoints);
        const ys = this.unit === 'kmh' ? ysMps.map(v => v * 3.6) : ysMps;
        const yLabel = this.unit === 'kmh' ? 'Vitesse (km/h)' : 'Vitesse (m/s)';


        const config: ChartConfiguration<'line'> = {
            type: 'line',
            data: {
                labels: xs.map(v => v.toFixed(0)),
                datasets: [
                    {
                        label: this.unit === 'kmh' ? 'v (km/h)' : 'v (m/s)',
                        data: ys,
                        tension: 0.15,
                        pointRadius: 0,
                        borderColor: '#198754',   // vert Bootstrap
                        borderWidth: 3,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true },
                    title: { display: true, text: this.title },
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Distance (m)' },
                        ticks: { maxTicksLimit: 12 },
                        grid: {
                            color: '#b6b6b6ff',      // Couleur des lignes de grille
                            lineWidth: 1,              // Épaisseur des lignes de grille
                        },
                        border: {
                            color: '#777777ff',             // Couleur de l'axe X
                            width: 2,                         // Epaisseur de l'axe X
                            dash: [4, 4],
                        },
                    },
                    y: {
                        title: { display: true, text: yLabel },
                        ticks: { maxTicksLimit: 8 },
                        grid: {
                            color: '#b6b6b6ff',      // Couleur des lignes de grille
                            lineWidth: 1,              // Épaisseur des lignes de grille
                        },
                        border: {
                            color: '#777777ff',             // Couleur de l'axe X
                            width: 2,                         // Epaisseur de l'axe X
                            dash: [4, 4],
                        },
                    },

                },
            },
        };


        this.destroyChart();
        this.chart = new Chart(this.canvas.nativeElement, config);

        // --- récupération de la zone de tracé ---
        const area = this.chart.chartArea;
        this.plotTop = area.top;
        this.plotHeight = area.bottom - area.top;
        this.plotLeft = area.left;
        this.plotWidth = area.right - area.left;

    }

    private destroyChart(): void {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }

    // ---------------- Utils ----------------

    private downsampleSV(
        points: PointSV[],
        maxPoints: number
    ): { xs: number[]; ys: number[] } {
        const n = points.length;
        if (n <= maxPoints) {
            return {
                xs: points.map(p => p.s),
                ys: points.map(p => p.v),
            };
        }

        const step = Math.ceil(n / maxPoints);
        const xs: number[] = [];
        const ys: number[] = [];

        for (let i = 0; i < n; i += step) {
            xs.push(points[i].s);
            ys.push(points[i].v);
        }

        const last = points[n - 1];
        if (xs[xs.length - 1] !== last.s) {
            xs.push(last.s);
            ys.push(last.v);
        }

        return { xs, ys };
    }

    getDistanceMax(): number {
        if (this.distanceMax != null && Number.isFinite(this.distanceMax) && this.distanceMax! > 0) {
            return this.distanceMax!;
        }
        if (!this.points?.length) return 1;
        return Math.max(1, this.points[this.points.length - 1].s);
    }

    bandStyle(iv: { d: number; f: number }): { [k: string]: string } {
        const max = this.getDistanceMax();
        const d = Math.max(0, Math.min(max, iv.d));
        const f = Math.max(0, Math.min(max, iv.f));

        const leftPct = (Math.min(d, f) / max) * 100;
        const widthPct = (Math.abs(f - d) / max) * 100;

        return {
            left: `${leftPct}%`,
            width: `${widthPct}%`,
        };
    }

}