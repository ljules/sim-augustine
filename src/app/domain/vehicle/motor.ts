import { MotorConfig } from '../types';

export class Motor {
  constructor(public readonly cfg: MotorConfig) {}

  /** FEM : ke * omega */
  fcem(omegaRadS: number): number {
    return this.cfg.ke * omegaRadS;
  }

  /**
   * Modèle sans inductance:
   * i = (u_mot - fcem) / rm, clamp i>=0 (roue libre)
   */
  currentNoInductance(u_mot: number, omegaRadS: number): number {
    const e = this.fcem(omegaRadS);
    let i = (u_mot - e) / this.cfg.rm;
    if (!Number.isFinite(i) || i < 0) i = 0;
    return i;
  }
}
