import { Motor } from './motor';
import { VehicleConfig } from '../types';

export class Vehicle {
  constructor(
    public readonly cfg: VehicleConfig,
    public readonly motor: Motor
  ) {}

  /**
   * Un pas de calcul (sans inductance):
   * Entrées:
   *  - u_mot : tension appliquée au moteur (V)
   *  - alphaRad : pente en radians (direct depuis Circuit.alphaAt)
   *  - v : vitesse (m/s)
   * Sorties:
   *  - dv_dt, dx_dt, i (comme ton Python en mode model_ind=False)
   */
  stepNoInductance(u_mot: number, alphaRad: number, v: number): { dv_dt: number; dx_dt: number; i: number } {
    // Liaison cinématique : w_moteur = v * r_red / r_roue
    const w_moteur = v * this.cfg.r_red / this.cfg.r_roue;

    // Courant (roue libre clamp i>=0)
    const i = this.motor.currentNoInductance(u_mot, w_moteur);

    // Résistances
    const force_pente = this.cfg.m * this.cfg.g * Math.sin(alphaRad);

    // force_sec = 0 si v==0 sinon copysign(m*g*fs, v)
    const force_sec = v === 0 ? 0 : Math.sign(v) * (this.cfg.m * this.cfg.g * this.cfg.fs);

    const force_visq = this.cfg.fv * v;

    // force_aero = copysign(0.5*rho*s*cx*v^2, v)
    const force_aero = Math.sign(v) * (0.5 * this.cfg.rho * this.cfg.s * this.cfg.cx * (v * v));

    // Propulsion (avec roue libre selon i>0)
    const force_propulsion_brute =
      (this.motor.cfg.kc * i - (i > 0 ? this.motor.cfg.cs : 0)) * this.cfg.r_red / this.cfg.r_roue;

    const force_perte_meca_moteur =
      i > 0 ? (this.motor.cfg.fvm * v * (this.cfg.r_red ** 2) / (this.cfg.r_roue ** 2)) : 0;

    const force_propulsion_nette = force_propulsion_brute - force_perte_meca_moteur;

    // Inertie équivalente (prise en compte de jm si i>0)
    const inertie =
      this.cfg.m + (i > 0 ? (this.motor.cfg.jm * (this.cfg.r_red ** 2) / (this.cfg.r_roue ** 2)) : 0);

    // Dynamique
    const dv_dt =
      (force_propulsion_nette - force_pente - force_sec - force_visq - force_aero) / inertie;

    const dx_dt = v;

    return { dv_dt, dx_dt, i };
  }
}
