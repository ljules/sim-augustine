import { StrategyConfig } from '../types';

export class OnOffStrategy {
  private isOn = true;

  constructor(private cfg: StrategyConfig) {}

  reset() { this.isOn = true; }

  pwmFor(v: number): number {
    if (this.isOn && v >= this.cfg.vMax) this.isOn = false;
    if (!this.isOn && v <= this.cfg.vMin) this.isOn = true;
    return this.isOn ? this.cfg.pwmOn : 0;
  }
}
