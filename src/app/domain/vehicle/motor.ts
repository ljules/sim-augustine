import { MotorConfig } from '../types';

export class Motor {
  constructor(private cfg: MotorConfig) {}

  /**
   * Retourne courant (A) et couple roue (N.m) pour une commande pwm (0..1) et une vitesse véhicule v (m/s)
   * Modèle simple : V_appliquée = pwm * Vmax
   * omega moteur = (v / r) * gearRatio
   * i = (V - ke*omega)/R, clamp >= 0 (pas de frein régénératif dans le MVP)
   * tau_m = kt * i * efficiency
   * tau_w = tau_m * gearRatio
   */
  compute(pwm: number, v: number, wheelRadiusM: number): { i: number; tauWheel: number; vApplied: number } {
    const V = Math.max(0, Math.min(1, pwm)) * this.cfg.maxVoltage;
    const omegaWheel = v / Math.max(1e-9, wheelRadiusM);
    const omegaMotor = omegaWheel * this.cfg.gearRatio;

    let i = (V - this.cfg.ke * omegaMotor) / this.cfg.R;
    if (!Number.isFinite(i)) i = 0;
    if (i < 0) i = 0; // MVP : pas de regen

    const tauMotor = this.cfg.kt * i * this.cfg.efficiency;
    const tauWheel = tauMotor * this.cfg.gearRatio;

    return { i, tauWheel, vApplied: V };
  }
}
