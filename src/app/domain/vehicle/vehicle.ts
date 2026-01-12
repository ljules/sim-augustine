import { VehicleConfig } from '../types';

export class Vehicle {
  constructor(private cfg: VehicleConfig) {}

  /**
   * Accélération à partir du couple roue et de la pente.
   * Forces :
   *  - traction = tauWheel / r
   *  - roulement = m*g*crr*cos(alpha)
   *  - pente = m*g*sin(alpha)
   *  - aéro = 0.5*rho*CdA*v^2
   */
  accel(v: number, tauWheel: number, alphaRad: number): number {
    const m = this.cfg.massKg;
    const g = this.cfg.g;
    const r = this.cfg.wheelRadiusM;

    const fTraction = tauWheel / Math.max(1e-9, r);
    const fRoll = m * g * this.cfg.crr * Math.cos(alphaRad);
    const fSlope = m * g * Math.sin(alphaRad);
    const fAero = 0.5 * this.cfg.airDensity * this.cfg.cdA * v * v;

    const fNet = fTraction - fRoll - fSlope - fAero;
    return fNet / m;
  }
}
