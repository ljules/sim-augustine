import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

import type { Interval, IntervalColor } from '../../domain/types';

type Pt = { x: number; y: number; s: number };      // UTM + distance
type Pt2 = { x: number; y: number; s: number };     // projeté (SVG) + distance

type HighlightPath = {
  d: string;
  color: string; // couleur SVG
};

@Component({
  selector: 'app-circuit-map-component',
  standalone: true,
  imports: [CommonModule],
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

  @Input() showDirectionArrow = true;

  /** Distance (m) à laquelle on place la flèche (ex: 50m après le départ) */
  @Input() arrowAtDistance = 50;

  /** Taille de la flèche en pixels SVG */
  @Input() arrowSize = 14;

  /** Position du curseur (animation) */
  @Input() cursorDistance  = 0;

  /** Avatar du pilote */
  @Input() cursorAvatarUrl: string | null = null;


  circuitPath = '';
  highlightPaths: HighlightPath[] = [];
  start: Pt2 | null = null;
  cursor: Pt2 | null = null;


  private projected: Pt2[] = [];

  arrowPoints: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['s'] ||
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

    // Mise à jour du curseur : 
    if (changes['cursorDistance'] || changes['s'] || changes['utmX'] || changes['utmY'] || changes['keepEveryMeters']) {
        this.updateCursor();
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

    this.arrowPoints = null;
    if (this.showDirectionArrow) {
      this.arrowPoints = this.computeArrowPoints(this.projected, this.arrowAtDistance, this.arrowSize);
    }
  }

  private rebuildHighlights(): void {
    this.highlightPaths = [];
    if (!this.projected.length) return;
    if (!this.intervals?.length) return;

    const sorted = [...this.intervals].slice().sort((a, b) => a.d - b.d);

    for (const it of sorted) {
      const d = Math.max(0, Math.min(it.d, it.f));
      const f = Math.max(0, Math.max(it.d, it.f));

      const i0 = this.lowerBoundS(this.projected, d);
      const i1 = this.upperBoundS(this.projected, f);

      if (i1 - i0 >= 2) {
        const seg = this.projected.slice(i0, i1);
        const pathD = this.toPath(seg);

        this.highlightPaths.push({
          d: pathD,
          color: this.strokeForIntervalColor(it.color),
        });
      }
    }
  }

  private strokeForIntervalColor(c: IntervalColor | undefined): string {
    // Couleurs cohérentes avec Bootstrap (tu peux ajuster si tu as ton propre thème)
    if (c === 'red') return '#dc3545';
    if (c === 'blue') return '#0d6efd';
    // défaut : yellow
    return '#ffc107';
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

  private computeArrowPoints(pts: { x: number; y: number; s: number }[], atS: number, size: number): string | null {
    if (pts.length < 2) return null;

    // Trouver l’index proche de la distance demandée
    const i = Math.min(Math.max(this.lowerBoundS(pts, atS), 0), pts.length - 2);
    const p = pts[i];
    const q = pts[i + 1];

    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) return null;

    // Vecteur unitaire direction
    const ux = dx / len;
    const uy = dy / len;

    // Perpendiculaire unitaire
    const px = -uy;
    const py = ux;

    // Géométrie flèche (triangle)
    const headX = p.x + ux * size;
    const headY = p.y + uy * size;

    const baseX = p.x - ux * (size * 1.0);
    const baseY = p.y - uy * (size * 1.0);

    const halfW = size * 0.80;

    const leftX = baseX + px * halfW;
    const leftY = baseY + py * halfW;

    const rightX = baseX - px * halfW;
    const rightY = baseY - py * halfW;

    // points="x1,y1 x2,y2 x3,y3"
    return `${headX.toFixed(2)},${headY.toFixed(2)} ${leftX.toFixed(2)},${leftY.toFixed(2)} ${rightX.toFixed(2)},${rightY.toFixed(2)}`;
  }

  private updateCursor(): void {
  if (!this.projected.length) {
    this.cursor = null;
    return;
  }
  this.cursor = this.pointAtDistance(this.projected, this.cursorDistance);
}

private pointAtDistance(pts: Pt2[], s: number): Pt2 {
  // borne
  if (s <= pts[0].s) return pts[0];
  const last = pts[pts.length - 1];
  if (s >= last.s) return last;

  // i = premier index tel que pts[i].s >= s
  const i = this.lowerBoundS(pts, s);

  // sécurité (au cas où)
  if (i <= 0) return pts[0];
  if (i >= pts.length) return last;

  const p0 = pts[i - 1];
  const p1 = pts[i];

  const ds = p1.s - p0.s;
  if (Math.abs(ds) < 1e-9) return p1;

  const a = (s - p0.s) / ds;

  return {
    s,
    x: p0.x + (p1.x - p0.x) * a,
    y: p0.y + (p1.y - p0.y) * a,
  };
}

}
