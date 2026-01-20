import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

export type Interval = { d: number; f: number };

type Pt = { x: number; y: number; s: number };      // UTM + distance
type Pt2 = { x: number; y: number; s: number };     // projeté (SVG) + distance


@Component({
  selector: 'app-circuit-map-component',
  standalone: true,
  imports: [CommonModule ],
  templateUrl: './circuit-map-component.component.html',
  styleUrl: './circuit-map-component.component.css'
})


export class CircuitMapComponent implements OnChanges {
  /** Distances (m) : DOIT être trié croissant */
  @Input() s: number[] = [];

  /** Coordonnées UTM (m) */
  @Input() utmX: number[] = [];
  @Input() utmY: number[] = [];

  /** Intervalles d’accélération (m) */
  @Input() intervals: Interval[] = [];

  /** Dimensions viewBox */
  @Input() width = 800;
  @Input() height = 500;
  @Input() padding = 20;

  /** Décimation: garder un point tous les ~X mètres (0 => off) */
  @Input() keepEveryMeters = 0;

  circuitPath = '';
  highlightPaths: string[] = [];
  start: Pt2 | null = null;

  private projected: Pt2[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['s'] ||
        changes['utmX'] || changes['utmY'] ||
        changes['width'] || changes['height'] ||
        changes['padding'] ||
        changes['keepEveryMeters']
    ) {
      this.rebuildBase();
      
    }
    if (changes['intervals'] || changes['s'] || changes['utmX'] || changes['utmY']) {
      this.rebuildHighlights();
    }
  }

  private rebuildBase(): void {
    this.circuitPath = '';
    this.highlightPaths = [];
    this.start = null;
    this.projected = [];

    const pts = this.buildPoints(this.s, this.utmX, this.utmY);
    if (pts.length < 2) return;

    const decimated = this.keepEveryMeters > 0
      ? this.decimateByMeters(pts, this.keepEveryMeters)
      : pts;

    this.projected = this.projectToSvg(decimated, this.width, this.height, this.padding);
    this.circuitPath = this.toPath(this.projected);
    this.start = this.projected[0] ?? null;
  }

  private rebuildHighlights(): void {
    this.highlightPaths = [];
    if (!this.projected.length) return;
    if (!this.intervals?.length) return;

    // NOTE: on s’appuie sur les points NON décimés pour avoir des bornes propres,
    // mais on génère le path sur la version projetée/décimée.
    // Pour rester simple et cohérent, on convertit les intervalles en sous-ensembles
    // du tableau projeté (qui garde aussi s).
    const sorted = [...this.intervals].slice().sort((a, b) => a.d - b.d);

    for (const it of sorted) {
      const d = Math.max(0, Math.min(it.d, it.f));
      const f = Math.max(0, Math.max(it.d, it.f));

      const i0 = this.lowerBoundS(this.projected, d);
      const i1 = this.upperBoundS(this.projected, f);

      if (i1 - i0 >= 2) {
        const seg = this.projected.slice(i0, i1);
        this.highlightPaths.push(this.toPath(seg));
      }
    }
  }

  private buildPoints(s: number[], x: number[], y: number[]): Pt[] {
    const n = Math.min(s?.length ?? 0, x?.length ?? 0, y?.length ?? 0);
    const pts: Pt[] = [];
    for (let i = 0; i < n; i++) {
      const si = s[i];
      const xi = x[i];
      const yi = y[i];
      if (!Number.isFinite(si) || !Number.isFinite(xi) || !Number.isFinite(yi)) continue;
      pts.push({ s: si, x: xi, y: yi });
    }
    return pts;
  }

  private decimateByMeters(pts: Pt[], minStepM: number): Pt[] {
    const out: Pt[] = [];
    let lastS = -Infinity;
    for (const p of pts) {
      if (out.length === 0 || (p.s - lastS) >= minStepM) {
        out.push(p);
        lastS = p.s;
      }
    }
    // s'assurer qu’on garde le dernier point
    if (out.length && out[out.length - 1].s !== pts[pts.length - 1].s) {
      out.push(pts[pts.length - 1]);
    }
    return out;
  }

  private projectToSvg(pts: Pt[], w: number, h: number, pad: number): Pt2[] {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const dx = Math.max(1e-9, maxX - minX);
    const dy = Math.max(1e-9, maxY - minY);

    const sx = (w - 2 * pad) / dx;
    const sy = (h - 2 * pad) / dy;
    const s = Math.min(sx, sy);

    return pts.map(p => {
      const X = pad + (p.x - minX) * s;
      const Y = h - (pad + (p.y - minY) * s); // inversion Y
      return { x: X, y: Y, s: p.s };
    });
  }

  private toPath(pts: { x: number; y: number }[]): string {
    if (pts.length < 2) return '';
    const p0 = pts[0];
    let d = `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      d += ` L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    }
    return d;
  }

  // --- bornes par distance sur tableau trié par s
  private lowerBoundS(arr: Pt2[], s: number): number {
    let lo = 0, hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid].s < s) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  private upperBoundS(arr: Pt2[], s: number): number {
    let lo = 0, hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid].s <= s) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
}
