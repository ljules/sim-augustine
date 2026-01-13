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

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

@Component({
  selector: 'app-grade-chart',
  standalone: true,
  imports: [],
  templateUrl: './grade-chart.component.html',
  styleUrl: './grade-chart.component.css'
})


export class GradeChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;

  @Input() s: number[] = []; // distance (m)
  @Input() z: number[] = []; // altitude (m)
  @Input() title = 'Pente (%) en fonction de la distance (m)';

  // Lissage : fenêtre impaire (ex: 9 = +/-4 points)
  @Input() smoothWindow = 9;

  private chart: Chart | null = null;
  private viewReady = false;

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.viewReady) return;
    if (changes['s'] || changes['z'] || changes['smoothWindow']) this.render();
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
    if (this.s.length < 3) return;

    const gradePct = this.computeGradePct(this.s, this.z);
    const gradeSmoothed = this.movingAverage(gradePct, this.normalizeOdd(this.smoothWindow));

    // Downsample (même logique que l'altitude)
    const { xs, ys } = this.downsample(this.s, gradeSmoothed, 1500);

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: xs.map(v => v.toFixed(0)),
        datasets: [
          {
            label: 'Pente (%)',
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
            title: { display: true, text: 'Pente (%)' },
            ticks: { maxTicksLimit: 8 },
          },
        },
      },
    };

    this.destroyChart();
    this.chart = new Chart(this.canvas.nativeElement, config);
  }

  /**
   * Pente (%) = 100 * dz/ds.
   * Utilise une dérivée centrée pour les points internes.
   */
  private computeGradePct(s: number[], z: number[]): number[] {
    const n = s.length;
    const out = new Array<number>(n).fill(0);

    // Forward diff
    out[0] = 100 * (z[1] - z[0]) / Math.max(1e-9, (s[1] - s[0]));

    // Central diff
    for (let i = 1; i < n - 1; i++) {
      const ds = s[i + 1] - s[i - 1];
      out[i] = 100 * (z[i + 1] - z[i - 1]) / Math.max(1e-9, ds);
    }

    // Backward diff
    out[n - 1] = 100 * (z[n - 1] - z[n - 2]) / Math.max(1e-9, (s[n - 1] - s[n - 2]));

    // Clean NaN/Infinity
    for (let i = 0; i < n; i++) {
      if (!Number.isFinite(out[i])) out[i] = 0;
    }

    return out;
  }

  /**
   * Moyenne glissante centrée.
   * window doit être impaire. Bords: on réduit la fenêtre.
   */
  private movingAverage(x: number[], window: number): number[] {
    const n = x.length;
    const out = new Array<number>(n).fill(0);
    const half = Math.floor(window / 2);

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

  private normalizeOdd(v: number): number {
    if (!Number.isFinite(v) || v < 1) return 1;
    const iv = Math.floor(v);
    return iv % 2 === 1 ? iv : iv + 1;
  }

  private downsample(s: number[], y: number[], maxPoints: number): { xs: number[]; ys: number[] } {
    const n = s.length;
    if (n <= maxPoints) return { xs: s, ys: y };

    const step = Math.ceil(n / maxPoints);
    const xs: number[] = [];
    const ys: number[] = [];

    for (let i = 0; i < n; i += step) {
      xs.push(s[i]);
      ys.push(y[i]);
    }

    if (xs[xs.length - 1] !== s[n - 1]) {
      xs.push(s[n - 1]);
      ys.push(y[n - 1]);
    }

    return { xs, ys };
  }
}
