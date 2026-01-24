import { CommonModule } from '@angular/common';
import { Component, AfterViewInit, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';

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
type PointSI = { s: number; i: number };

@Component({
  selector: 'app-current-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './current-chart.component.html',
  styleUrl: './current-chart.component.css'
})


export class CurrentChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;

  @Input() points: PointSI[] = [];
  @Input() title = 'Courant moteur en fonction de la distance';
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

    const { xs, ys } = this.downsampleSI(this.points, this.maxPoints);

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: xs.map(v => v.toFixed(0)),
        datasets: [
          {
            data: ys,
            tension: 0.15,
            pointRadius: 0,
            borderColor: 'red',
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
          
        },
        scales: {
          x: { title: { display: true, text: 'Distance (m)' },
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
          y: { title: { display: true, text: 'Courant (A)' },
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

    this.chart?.destroy();
    this.chart = new Chart(this.canvas.nativeElement, config);
  }

  private downsampleSI(points: PointSI[], maxPoints: number): { xs: number[]; ys: number[] } {
    const n = points.length;
    if (n <= maxPoints) return { xs: points.map(p => p.s), ys: points.map(p => p.i) };

    const step = Math.ceil(n / maxPoints);
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < n; i += step) {
      xs.push(points[i].s);
      ys.push(points[i].i);
    }
    const last = points[n - 1];
    if (xs[xs.length - 1] !== last.s) {
      xs.push(last.s);
      ys.push(last.i);
    }
    return { xs, ys };
  }
}


