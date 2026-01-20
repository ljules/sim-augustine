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

import { CommonModule } from '@angular/common';

import {
  Chart,
  ChartConfiguration,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
} from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip);

type PointSE = { s: number; eElec: number };

@Component({
  selector: 'app-energy-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './energy-chart.component.html',
  styleUrl: './energy-chart.component.css'
})


export class EnergyChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;

  @Input() points: PointSE[] = [];
  @Input() title = 'Énergie cumulée (J) en fonction de la distance';
  @Input() maxPoints = 1500;

  private chart: Chart | null = null;
  private ready = false;

  ngAfterViewInit(): void {
    this.ready = true;
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.ready) return;
    if (changes['points'] || changes['title'] || changes['maxPoints']) this.render();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.chart = null;
  }

  private render(): void {
    if (!this.canvas?.nativeElement) return;
    if (!this.points?.length) return;

    const { xs, ys } = this.downsampleSE(this.points, this.maxPoints);

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: xs.map(v => v.toFixed(0)),
        datasets: [
          {
            data: ys,
            tension: 0.15,
            pointRadius: 0,
            borderColor: 'orange',
            borderWidth: 3
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
          title: { display: false }, // on met le titre dans la page, comme les autres
        },
        scales: {
          x: { title: { display: true, text: 'Distance (m)' }, ticks: { maxTicksLimit: 12 } },
          y: { title: { display: true, text: 'Énergie (J)' }, ticks: { maxTicksLimit: 8 } },
        },
      },
    };

    this.chart?.destroy();
    this.chart = new Chart(this.canvas.nativeElement, config);
  }

  private downsampleSE(points: PointSE[], maxPoints: number): { xs: number[]; ys: number[] } {
    const n = points.length;
    if (n <= maxPoints) return { xs: points.map(p => p.s), ys: points.map(p => p.eElec) };

    const step = Math.ceil(n / maxPoints);
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < n; i += step) {
      xs.push(points[i].s);
      ys.push(points[i].eElec);
    }
    const last = points[n - 1];
    if (xs[xs.length - 1] !== last.s) {
      xs.push(last.s);
      ys.push(last.eElec);
    }
    return { xs, ys };
  }
}

