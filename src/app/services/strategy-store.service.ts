import { Injectable } from '@angular/core';
import { Interval } from '../domain/types';
import type { IntervalColor, StrategyConfig, SimResult } from '../domain/types';

const KEY = 'strategyConfig';
const KEY_BADGE = 'pilotBadge';


@Injectable({
  providedIn: 'root'
})
export class StrategyStoreService {
  private cache: StrategyConfig | null = null;
  private simResult: SimResult | null = null;


  get(): StrategyConfig {
    if (this.cache) return this.cache;

    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as any;
      this.cache = this.normalize(parsed);

      // Persist la version normalisée (migration silencieuse)
      localStorage.setItem(KEY, JSON.stringify(this.cache));
      return this.cache;
    }

    // défaut MVP (dtSlope + color par intervalle)
    this.cache = {
      pwmOn: 1.0,
      defaultDtSlope: 5.0,
      defaultColor: 'yellow',
      intervals: [
        { d: 50, f: 200, dtSlope: 5.0, color: 'yellow' },
        { d: 670, f: 880, dtSlope: 5.0, color: 'yellow' },
      ],
    };

    localStorage.setItem(KEY, JSON.stringify(this.cache));
    return this.cache;
  }

  set(cfg: StrategyConfig): void {
    // Toujours normaliser avant d'écrire
    this.cache = this.normalize(cfg as any);
    localStorage.setItem(KEY, JSON.stringify(this.cache));
  }

  clear(): void {
    this.cache = null;
    this.simResult = null;
    localStorage.removeItem(KEY);
  }

  /**
   * Normalise + migre les anciens formats :
   * - ancien global dtSlope => utilisé comme fallback
   * - intervals anciens {d,f} => dtSlope injecté
   * - defaultDtSlope absent => fallback
   * - color absent => injecté via defaultColor
   */
  private normalize(input: any): StrategyConfig {
    const pwmOn = Number.isFinite(Number(input?.pwmOn)) ? Number(input.pwmOn) : 1.0;

    // Ancien modèle : dtSlope global (si existait) => fallback
    const legacyGlobalDtSlope = Number.isFinite(Number(input?.dtSlope))
      ? Math.max(0, Number(input.dtSlope))
      : undefined;

    // Nouveau champ defaultDtSlope (pour l'UI)
    const defaultDtSlope =
      Number.isFinite(Number(input?.defaultDtSlope))
        ? Math.max(0, Number(input.defaultDtSlope))
        : (legacyGlobalDtSlope ?? 0);

    // Nouveau champ defaultColor (pour l'UI)
    const defaultColor = this.normalizeColor(input?.defaultColor, 'yellow');

    const intervalsRaw = Array.isArray(input?.intervals) ? input.intervals : [];

    const intervals: Interval[] = intervalsRaw.map((iv: any) => {
      const d = Number(iv?.d) ?? 0;
      const f = Number(iv?.f) ?? 0;

      const dtSlope =
        Number.isFinite(Number(iv?.dtSlope))
          ? Math.max(0, Number(iv.dtSlope))
          : defaultDtSlope;

      const color = this.normalizeColor(iv?.color, defaultColor);

      return { d, f, dtSlope, color } as Interval;
    });

    // On retourne un objet propre, sans legacy dtSlope
    const out: StrategyConfig = {
      ...input,
      pwmOn,
      defaultDtSlope,
      defaultColor,
      intervals,
    };

    // Si tu veux vraiment supprimer dtSlope legacy du JSON stocké :
    delete (out as any).dtSlope;

    return out;
  }

  // Normalise une couleur vers le set autorisé.
  private normalizeColor(raw: any, fallback: IntervalColor): IntervalColor {
    const v = String(raw ?? '').toLowerCase();
    if (v === 'yellow' || v === 'red' || v === 'blue') return v;
    return fallback;
  }


  setSimResult(result: SimResult): void {
    this.simResult = result;
  }


  getSimResult(): SimResult | null {
    return this.simResult;
  }

  
   private pilotBadge: string | null = null;

   setPilotBadge(fileName: string | null): void {
        this.pilotBadge = fileName;
        if (!fileName) localStorage.removeItem(KEY_BADGE);
        else localStorage.setItem(KEY_BADGE, fileName);
  }

   getPilotBadge(): string | null {
        if (this.pilotBadge !== null) return this.pilotBadge;
        const raw = localStorage.getItem(KEY_BADGE);
        this.pilotBadge = raw ? raw : null;
        return this.pilotBadge;
   }


}
