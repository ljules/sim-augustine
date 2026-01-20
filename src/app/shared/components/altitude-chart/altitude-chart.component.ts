import { CommonModule } from '@angular/common';
import { Component, AfterViewInit, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { Chart, ChartConfiguration, LineController, LineElement, PointElement, LinearScale, CategoryScale,
    Tooltip, Legend } from 'chart.js';


// Enregistre les éléments nécessaires à un graphe "line"
Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);


@Component({
  selector: 'app-altitude-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './altitude-chart.component.html',
  styleUrl: './altitude-chart.component.css'
})


export class AltitudeChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;

  @Input() s: number[] = []; // distance
  @Input() z: number[] = []; // altitude
  @Input() title = 'Altitude (m) en fonction de la distance (m)';

  private chart: Chart | null = null;
  private viewReady = false;

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.viewReady) return;
    if (changes['s'] || changes['z']) this.render();
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  private destroyChart(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  private render(): void {
    if (!this.canvas?.nativeElement) return;
    if (!this.s?.length || !this.z?.length || this.s.length !== this.z.length) return;

    // Downsample léger si besoin (1321 points -> OK, mais on garde une méthode safe)
    const { xs, ys } = this.downsample(this.s, this.z, 1500);

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: xs.map(v => v.toFixed(0)),
        datasets: [
          {
            label: 'Altitude (m)',
            data: ys,
            tension: 0.15,
            pointRadius: 0, // pas de points -> plus lisible + performant
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
          },
          y: {
            title: { display: true, text: 'Altitude (m)' },
            ticks: { maxTicksLimit: 8 },
          },
        },
      },
    };

    this.destroyChart();
    this.chart = new Chart(this.canvas.nativeElement, config);
  }

  /**
   * Conserve maxPoints points (échantillonnage simple).
   * Utile si un jour vous chargez un circuit avec 50k points.
   */
  private downsample(s: number[], z: number[], maxPoints: number): { xs: number[]; ys: number[] } {
    const n = s.length;
    if (n <= maxPoints) return { xs: s, ys: z };

    const step = Math.ceil(n / maxPoints);
    const xs: number[] = [];
    const ys: number[] = [];

    for (let i = 0; i < n; i += step) {
      xs.push(s[i]);
      ys.push(z[i]);
    }

    // s’assurer qu’on inclut le dernier point
    if (xs[xs.length - 1] !== s[n - 1]) {
      xs.push(s[n - 1]);
      ys.push(z[n - 1]);
    }

    return { xs, ys };
  }
}