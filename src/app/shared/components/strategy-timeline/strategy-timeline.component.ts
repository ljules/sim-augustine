import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Interval, IntervalColor } from '../../../domain/types';

type DragMode = 'none' | 'handle-d' | 'handle-f' | 'segment';

@Component({
  selector: 'app-strategy-timeline',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './strategy-timeline.component.html',
  styleUrl: './strategy-timeline.component.css'
})
export class StrategyTimelineComponent implements AfterViewInit {
  @ViewChild('track', { static: true }) trackRef!: ElementRef<HTMLDivElement>;

  /** Distance max en mètres (ex: distance du circuit) */
  @Input() distanceMax = 1000;

  /** Pas d'arrondi en mètres (snap) */
  @Input() snapM = 1;

  /** Longueur min d'un intervalle (m) */
  @Input() minLenM = 5;

  /** Intervalles (m) */
  @Input() intervals: Interval[] = [];

  /** Émet la liste mise à jour */
  @Output() intervalsChange = new EventEmitter<Interval[]>();

  /** Rampe PWM par défaut (s) pour les nouveaux intervalles */
  @Input() defaultDtSlope = 0;

  /** Émet defaultDtSlope mis à jour */
  @Output() defaultDtSlopeChange = new EventEmitter<number>();

  /** Couleur par défaut pour les intervalles */
  @Input() defaultColor: IntervalColor = 'yellow';

  /** Émet defaultColorChange mis à jour */
  @Output() defaultColorChange = new EventEmitter<IntervalColor>();

  /** Option MVP: autoriser chevauchements */
  @Input() allowOverlap = true;

  private trackWidthPx = 1;

  // drag state
  private dragMode: DragMode = 'none';
  private dragIndex = -1;
  private pointerId: number | null = null;
  private startClientX = 0;

  private startD = 0;
  private startF = 0;

  ngAfterViewInit(): void {
    this.measure();
    // Re-mesure si resize fenêtre
    window.addEventListener('resize', this.onResize);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
  }

  private onResize = () => this.measure();

  private measure(): void {
    const el = this.trackRef?.nativeElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    this.trackWidthPx = Math.max(1, rect.width);
  }

  setDefaultDtSlope(raw: any): void {
    const n = Number(raw);
    const v = Number.isFinite(n) ? Math.max(0, n) : 0;
    if (v === this.defaultDtSlope) return;
    this.defaultDtSlope = v;
    this.defaultDtSlopeChange.emit(this.defaultDtSlope);
  }

  setIntervalDtSlope(index: number, raw: any): void {
    const n = Number(raw);
    const v = Number.isFinite(n) ? Math.max(0, n) : 0;

    const next = this.intervals.map((iv, i) =>
      i === index ? { ...iv, dtSlope: v } : iv
    );

    this.setIntervals(next);
  }

  setDefaultColor(color: IntervalColor): void {
    if (color === this.defaultColor) return;
    this.defaultColor = color;
    this.defaultColorChange.emit(this.defaultColor);
  }

  setIntervalColor(index: number, color: IntervalColor): void {
    const next = this.intervals.map((iv, i) =>
      i === index ? { ...iv, color } : iv
    );

    this.setIntervals(next);
  }

  // ---------- UI helpers ----------
  pxFromM(m: number): number {
    const clamped = this.clamp(m, 0, this.distanceMax);
    return (clamped / this.distanceMax) * this.trackWidthPx;
  }

  percentFromM(m: number): number {
    const clamped = this.clamp(m, 0, this.distanceMax);
    return (clamped / this.distanceMax) * 100;
  }

  // ---------- Actions ----------
  addInterval(): void {
    // Interval par défaut au début, 50m ou minLen
    const d = 20;
    const f = Math.min(this.distanceMax, Math.max(this.minLenM, d + 50));

    const newIv: Interval = { d, f, dtSlope: this.defaultDtSlope, color: this.defaultColor };
    const next = [...this.intervals, newIv];

    this.setIntervals(next);
  }

  removeInterval(i: number): void {
    const next = this.intervals.filter((_, idx) => idx !== i);
    this.setIntervals(next);
  }

  // ---------- Pointer handling ----------
  onPointerDownHandle(ev: PointerEvent, index: number, which: 'd' | 'f'): void {
    ev.preventDefault();
    this.beginDrag(ev, index, which === 'd' ? 'handle-d' : 'handle-f');
  }

  onPointerDownSegment(ev: PointerEvent, index: number): void {
    ev.preventDefault();
    this.beginDrag(ev, index, 'segment');
  }

  private beginDrag(ev: PointerEvent, index: number, mode: DragMode): void {
    this.measure();
    this.dragMode = mode;
    this.dragIndex = index;
    this.pointerId = ev.pointerId;
    this.startClientX = ev.clientX;

    const it = this.intervals[index];
    this.startD = it.d;
    this.startF = it.f;

    // capture
    this.trackRef.nativeElement.setPointerCapture(ev.pointerId);
  }

  onPointerMove(ev: PointerEvent): void {
    if (this.dragMode === 'none') return;
    if (this.pointerId !== ev.pointerId) return;

    const dxPx = ev.clientX - this.startClientX;
    const dxM = (dxPx / this.trackWidthPx) * this.distanceMax;

    const current = this.cloneIntervals(this.intervals);
    const it = current[this.dragIndex];
    if (!it) return;

    if (this.dragMode === 'handle-d') {
      let newD = this.snap(this.startD + dxM);
      // contraintes
      newD = this.clamp(newD, 0, it.f - this.minLenM);
      it.d = newD;
    }

    if (this.dragMode === 'handle-f') {
      let newF = this.snap(this.startF + dxM);
      newF = this.clamp(newF, it.d + this.minLenM, this.distanceMax);
      it.f = newF;
    }

    if (this.dragMode === 'segment') {
      const len = this.startF - this.startD;
      let newD = this.snap(this.startD + dxM);
      newD = this.clamp(newD, 0, this.distanceMax - len);
      it.d = newD;
      it.f = newD + len;
    }

    // (Optionnel) gestion chevauchement : pour MVP on laisse allowOverlap=true
    if (!this.allowOverlap) {
      this.resolveOverlaps(current, this.dragIndex);
      // resolveOverlaps met déjà this.intervals
      this.intervalsChange.emit(this.intervals);
      return;
    }

    this.setIntervals(current, false); // pas besoin de re-snap global, déjà fait
  }

  onPointerUp(ev: PointerEvent): void {
    if (this.dragMode === 'none') return;
    if (this.pointerId !== ev.pointerId) return;

    // libère
    try {
      this.trackRef.nativeElement.releasePointerCapture(ev.pointerId);
    } catch { }

    this.dragMode = 'none';
    this.dragIndex = -1;
    this.pointerId = null;

    // tri + clean final (snap + clamp)
    const cleaned = this.cleanIntervals(this.intervals);
    this.setIntervals(cleaned);
  }

  // ---------- Interval utilities ----------
  private setIntervals(next: Interval[], emit = true): void {
    this.intervals = next;
    if (emit) this.intervalsChange.emit(this.intervals);
  }

  private cleanIntervals(list: Interval[]): Interval[] {
    const out = list
      .map(it => {
        let d = this.snap(this.clamp(it.d, 0, this.distanceMax));
        let f = this.snap(this.clamp(it.f, 0, this.distanceMax));
        if (f < d) [d, f] = [f, d];
        if (f - d < this.minLenM) f = this.clamp(d + this.minLenM, 0, this.distanceMax);

        // dtSlope & color doivent rester associés à l'intervalle
        const dtSlope = it.dtSlope ?? this.defaultDtSlope;
        const color = it.color ?? this.defaultColor;

        return { d, f, dtSlope, color };
      })
      .sort((a, b) => a.d - b.d);

    // (Optionnel) supprimer segments vides
    return out.filter(it => it.f - it.d >= this.minLenM);
  }

  private resolveOverlaps(list: Interval[], movedIndex: number): void {
    // Simple: après tri, on “repousse” pour éviter overlap (MVP : minimal)
    const sorted = this.cleanIntervals(list);

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const cur = sorted[i];

      if (cur.d < prev.f) {
        const len = cur.f - cur.d;
        cur.d = prev.f;
        cur.f = this.clamp(cur.d + len, 0, this.distanceMax);

        // si trop court, clamp encore
        if (cur.f - cur.d < this.minLenM) {
          cur.f = this.clamp(cur.d + this.minLenM, 0, this.distanceMax);
        }
      }
    }

    // remet (pas parfait index moved, mais suffisant MVP)
    this.intervals = sorted;
  }

  private cloneIntervals(list: Interval[]): Interval[] {
    return list.map(it => ({
      d: it.d,
      f: it.f,
      dtSlope: it.dtSlope ?? this.defaultDtSlope,
      color: it.color ?? this.defaultColor,
    }));
  }

  private clamp(v: number, a: number, b: number): number {
    return Math.max(a, Math.min(b, v));
  }

  private snap(v: number): number {
    const step = Math.max(1e-9, this.snapM);
    return Math.round(v / step) * step;
  }
}
