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

@Component({
  selector: 'app-speed-chart',
  standalone: true,
  imports: [],
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

  private chart: Chart | null = null;
  private viewReady = false;

  // ---------------- Lifecycle ----------------

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.viewReady) return;
    if (changes['points'] || changes['title'] || changes['maxPoints']) {
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

    const { xs, ys } = this.downsampleSV(this.points, this.maxPoints);

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: xs.map(v => v.toFixed(0)),
        datasets: [
          {
            label: 'v (m/s)',
            data: ys,
            tension: 0.15,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: true },
          tooltip: { enabled: true },
          title: { display: true, text: this.title },
        },
        scales: {
          x: {
            title: { display: true, text: 'Distance (m)' },
            ticks: { maxTicksLimit: 12 },
          },
          y: {
            title: { display: true, text: 'Vitesse (m/s)' },
            ticks: { maxTicksLimit: 8 },
          },
        },
      },
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
}