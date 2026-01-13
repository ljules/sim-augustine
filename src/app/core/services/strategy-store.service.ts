import { Injectable } from '@angular/core';
import { StrategyConfig } from '../../domain/types';

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
      this.cache = JSON.parse(raw);
      return this.cache!;
    }

    // défaut MVP
    this.cache = {
      pwmOn: 1.0,
      intervals: [
        { d: 50, f: 200 },
        { d: 670, f: 880 },
      ],
    };
    return this.cache;
  }

  set(cfg: StrategyConfig): void {
    this.cache = cfg;
    localStorage.setItem(KEY, JSON.stringify(cfg));
  }

  clear(): void {
    this.cache = null;
    localStorage.removeItem(KEY);
  }
}