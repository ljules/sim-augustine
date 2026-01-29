import { Injectable } from '@angular/core';
import { StrategyConfig, Interval } from '../../domain/types';

const KEY = 'strategyConfig';

@Injectable({
  providedIn: 'root'
})
export class StrategyStoreService {
  private cache: StrategyConfig | null = null;

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

    // défaut MVP (nouveau modèle : dtSlope par intervalle)
    this.cache = {
      pwmOn: 1.0,
      defaultDtSlope: 5.0,
      intervals: [
        { d: 50, f: 200, dtSlope: 5.0 },
        { d: 670, f: 880, dtSlope: 5.0 },
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
    localStorage.removeItem(KEY);
  }

  /**
   * Normalise + migre les anciens formats :
   * - ancien global dtSlope => utilisé comme fallback
   * - intervals anciens {d,f} => dtSlope injecté
   * - defaultDtSlope absent => fallback
   */
  private normalize(input: any): StrategyConfig {
    const pwmOn = Number.isFinite(Number(input?.pwmOn)) ? Number(input.pwmOn) : 1.0;

    // Ancien modèle : dtSlope global (si existait) => fallback
    const legacyGlobalDtSlope = Number.isFinite(Number(input?.dtSlope)) ? Math.max(0, Number(input.dtSlope)) : undefined;

    // Nouveau champ defaultDtSlope (pour l'UI)
    const defaultDtSlope =
      Number.isFinite(Number(input?.defaultDtSlope))
        ? Math.max(0, Number(input.defaultDtSlope))
        : (legacyGlobalDtSlope ?? 0);

    const intervalsRaw = Array.isArray(input?.intervals) ? input.intervals : [];

    const intervals: Interval[] = intervalsRaw.map((iv: any) => {
      const d = Number(iv?.d) ?? 0;
      const f = Number(iv?.f) ?? 0;

      const dtSlope =
        Number.isFinite(Number(iv?.dtSlope))
          ? Math.max(0, Number(iv.dtSlope))
          : defaultDtSlope;

      return { d, f, dtSlope };
    });

    // On retourne un objet propre, sans legacy dtSlope
    const out: StrategyConfig = {
      ...input,
      pwmOn,
      defaultDtSlope,
      intervals,
    };

    // Si tu veux vraiment supprimer dtSlope legacy du JSON stocké :
    delete (out as any).dtSlope;

    return out;
  }
}
