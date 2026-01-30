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

import type { SimPoint } from '../../../domain/types';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

@Component({
    selector: 'app-pwm-chart',
    standalone: true,
    imports: [],
    templateUrl: './pwm-chart.component.html',
    styleUrl: './pwm-chart.component.css'
})


export class PwmChartComponent implements AfterViewInit, OnChanges, OnDestroy {
    @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

    @Input() points: SimPoint[] = [];
    @Input() distanceMax = 1000;

    private chart?: Chart;

    ngAfterViewInit(): void {
        this.createChart();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (!this.chart) return;

        if (changes['points'] || changes['distanceMax']) {
            this.updateChart();

            // Important : mettre à jour max de l’axe X
            const xScale = this.chart.options.scales?.['x'];
            if (xScale && typeof xScale === 'object') {
                (xScale as any).max = this.distanceMax;
            }

            this.chart.update();
        }
    }


    ngOnDestroy(): void {
        this.chart?.destroy();
    }

    private createChart(): void {
        const ctx = this.canvasRef.nativeElement.getContext('2d');
        if (!ctx) return;

        const cfg: ChartConfiguration<'line'> = {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'PWM',
                        data: [],
                        pointRadius: 0,
                        tension: 0,
                        borderWidth: 4,
                        borderColor: '#6f42c1',
                        backgroundColor: '#6f42c1',
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
                },
                scales: {
                    x: {
                        type: 'linear',
                        min: 0,
                        max: this.distanceMax,
                        title: { display: true, text: 'Distance (m)', color: '#000' },
                        ticks: {
                            //color: '#000',
                            //font: { weight: 'bold' },
                        },
                        border: {
                            color: '#000',
                            width: 2,
                        },
                    },
                    y: {
                        min: 0,
                        max: 1.2,
                        title: { display: true, text: 'PWM', color: '#000' },
                        ticks: {
                            //color: '#000',                            
                        },
                        border: {
                            color: '#000',
                            width: 2,   // ✅ axe plus épais
                        },
                    },
                },

            },
        };

        this.chart = new Chart(ctx, cfg);
        this.updateChart();
    }

    private updateChart(): void {
        if (!this.chart) return;

        const data = this.points.map(p => ({ x: p.s, y: p.pwm }));

        // En mode linear, on n’utilise pas labels
        this.chart.data.labels = [];
        this.chart.data.datasets[0].data = data as any;

        // Met à jour la borne max (important si distanceMax change après init)
        const x = this.chart.options.scales?.['x'] as any;
        if (x) {
            x.min = 0;
            x.max = Math.round(this.distanceMax);
        }

        this.chart.update();
    }


}
