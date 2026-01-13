import { Interval, StrategyConfig } from '../types';

export class IntervalStrategy {
  constructor(private cfg: StrategyConfig) {}

  pwmForDistance(s: number): number {
    const on = this.cfg.intervals.some((iv: Interval) => s >= iv.d && s <= iv.f);
    return on ? this.cfg.pwmOn : 0;
  }
}
