import { Injectable } from '@angular/core';

import type {
  Interval,
  IntervalColor,
  RaceSessionConfig,
  SimResult,
  StrategyConfig,
} from '../domain/types';
import {
  buildDefaultRaceSessionConfig,
  cloneStrategyConfig,
} from '../domain/session/race-session';

const KEY = 'raceSessionConfig';
const LEGACY_STRATEGY_KEY = 'strategyConfig';

@Injectable({
  providedIn: 'root'
})
export class RaceSessionStoreService {
  private cache: RaceSessionConfig | null = null;
  private startLapResult: SimResult | null = null;

  get(): RaceSessionConfig {
    if (this.cache) return this.cache;

    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        this.cache = this.normalizeSession(parsed);
        localStorage.setItem(KEY, JSON.stringify(this.cache));
        return this.cache;
      } catch {
        // Si la session est illisible, on retombe sur la migration legacy.
      }
    }

    const legacy = this.getLegacyStrategyConfig();
    this.cache = buildDefaultRaceSessionConfig(legacy);
    localStorage.setItem(KEY, JSON.stringify(this.cache));
    return this.cache;
  }

  set(cfg: RaceSessionConfig): void {
    this.cache = this.normalizeSession(cfg);
    localStorage.setItem(KEY, JSON.stringify(this.cache));
  }

  clear(): void {
    this.cache = null;
    this.startLapResult = null;
    localStorage.removeItem(KEY);
  }

  setStartLapResult(result: SimResult | null): void {
    this.startLapResult = result;
  }

  getStartLapResult(): SimResult | null {
    return this.startLapResult;
  }

  private getLegacyStrategyConfig(): StrategyConfig | undefined {
    const raw = localStorage.getItem(LEGACY_STRATEGY_KEY);
    if (!raw) return undefined;

    try {
      return this.normalizeStrategy(JSON.parse(raw) as unknown);
    } catch {
      return undefined;
    }
  }

  private normalizeSession(input: unknown): RaceSessionConfig {
    const candidate = input as Partial<RaceSessionConfig> | null;
    const fallback = buildDefaultRaceSessionConfig();

    const totalLaps = Number.isFinite(Number(candidate?.totalLaps))
      ? Math.max(1, Math.floor(Number(candidate?.totalLaps)))
      : fallback.totalLaps;

    const startLapStrategy = this.normalizeStrategy(
      candidate?.startLapStrategy ?? fallback.startLapStrategy
    );

    const raceLapStrategy = this.normalizeStrategy(
      candidate?.raceLapStrategy ?? cloneStrategyConfig(startLapStrategy)
    );

    return {
      totalLaps,
      startLapStrategy,
      raceLapStrategy,
    };
  }

  private normalizeStrategy(input: unknown): StrategyConfig {
    const candidate = input as Partial<StrategyConfig> & { dtSlope?: unknown } | null;

    const pwmOn = Number.isFinite(Number(candidate?.pwmOn))
      ? Number(candidate?.pwmOn)
      : 1.0;

    const legacyGlobalDtSlope = Number.isFinite(Number(candidate?.dtSlope))
      ? Math.max(0, Number(candidate?.dtSlope))
      : undefined;

    const defaultDtSlope = Number.isFinite(Number(candidate?.defaultDtSlope))
      ? Math.max(0, Number(candidate?.defaultDtSlope))
      : (legacyGlobalDtSlope ?? 0);

    const defaultColor = this.normalizeColor(candidate?.defaultColor, 'yellow');
    const intervalsRaw = Array.isArray(candidate?.intervals) ? candidate.intervals : [];

    const intervals: Interval[] = intervalsRaw.map((iv: unknown) => {
      const item = iv as Partial<Interval> | null;

      const d = Number.isFinite(Number(item?.d)) ? Number(item?.d) : 0;
      const f = Number.isFinite(Number(item?.f)) ? Number(item?.f) : 0;
      const dtSlope = Number.isFinite(Number(item?.dtSlope))
        ? Math.max(0, Number(item?.dtSlope))
        : defaultDtSlope;
      const color = this.normalizeColor(item?.color, defaultColor);

      return { d, f, dtSlope, color };
    });

    const vInit = Number.isFinite(Number(candidate?.vInit))
      ? Math.max(0, Number(candidate?.vInit))
      : 0;

    return {
      pwmOn,
      vInit,
      defaultDtSlope,
      defaultColor,
      intervals,
    };
  }

  private normalizeColor(raw: unknown, fallback: IntervalColor): IntervalColor {
    const v = String(raw ?? '').toLowerCase();
    if (v === 'red') return 'green';
    if (v === 'yellow' || v === 'green' || v === 'blue') return v;
    return fallback;
  }
}
