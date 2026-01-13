import { Circuit } from '../circuit/circuit';
import { Vehicle } from '../vehicle/vehicle';
import { IntervalStrategy } from '../strategy/interval-strategy';
import { SimPoint, SimResult } from '../types';

/**
 * Euler dt fixe, modèle sans inductance.
 */
export function simulateEulerIntervals(
  circuit: Circuit,
  vehicle: Vehicle,
  strategy: IntervalStrategy,
  dt: number,
  tMax: number
): SimResult {
  const points: SimPoint[] = [];

  let t = 0;
  let s = 0;
  let v = 0;
  let eJ = 0;

  const sEnd = circuit.maxDistance();
  const Vmax = vehicle.motor.cfg.maxVoltage;

  while (t <= tMax && s < sEnd) {
    const alpha = circuit.alphaAt(s);
    const pwm = strategy.pwmForDistance(s);
    const u_mot = pwm * Vmax;

    const { dv_dt, dx_dt, i } = vehicle.stepNoInductance(u_mot, alpha, v);

    // intégration Euler
    const vNext = Math.max(0, v + dv_dt * dt);
    const sNext = s + dx_dt * dt;

    // puissance/énergie électrique (approx)
    const pElec = i * u_mot;
    eJ += Math.max(0, pElec) * dt;

    points.push({
      t,
      s,
      v,
      i,
      pwm,
      alphaRad: alpha,
      pElec,
      eElec: eJ,
    });

    v = vNext;
    s = sNext;
    t += dt;

    // sécurité anti boucle infinie si v=0 et pwm=0
    if (points.length > 5 && v === 0 && pwm === 0) break;
  }

  const totalTime = points.length ? points[points.length - 1].t : 0;
  const totalDistance = points.length ? points[points.length - 1].s : 0;
  const totalEnergyJ = points.length ? points[points.length - 1].eElec : 0;
  const vAvg = totalTime > 0 ? totalDistance / totalTime : 0;

  return { points, totalTime, totalDistance, totalEnergyJ, vAvg };
}

/**
 * RK4 dt fixe, modèle sans inductance.
 * Remarque: u_mot dépend de s (via strategy), donc on recalc à chaque évaluation.
 */
export function simulateRK4Intervals(
  circuit: Circuit,
  vehicle: Vehicle,
  strategy: IntervalStrategy,
  dt: number,
  tMax: number
): SimResult {
  const points: SimPoint[] = [];

  let t = 0;
  let s = 0;
  let v = 0;
  let eJ = 0;

  const sEnd = circuit.maxDistance();
  const Vmax = vehicle.motor.cfg.maxVoltage;

  const deriv = (sLocal: number, vLocal: number) => {
    const alpha = circuit.alphaAt(sLocal);
    const pwm = strategy.pwmForDistance(sLocal);
    const u_mot = pwm * Vmax;

    const { dv_dt, dx_dt, i } = vehicle.stepNoInductance(u_mot, alpha, vLocal);
    return { ds: dx_dt, dv: dv_dt, alpha, pwm, u_mot, i };
  };

  while (t <= tMax && s < sEnd) {
    const k1 = deriv(s, v);
    const k2 = deriv(s + 0.5 * dt * k1.ds, v + 0.5 * dt * k1.dv);
    const k3 = deriv(s + 0.5 * dt * k2.ds, v + 0.5 * dt * k2.dv);
    const k4 = deriv(s + dt * k3.ds, v + dt * k3.dv);

    const sNext = s + (dt / 6) * (k1.ds + 2 * k2.ds + 2 * k3.ds + k4.ds);
    const vNext = Math.max(0, v + (dt / 6) * (k1.dv + 2 * k2.dv + 2 * k3.dv + k4.dv));

    // énergie : on prend la puissance du point courant (k1) en approximation
    const pElec = k1.i * k1.u_mot;
    eJ += Math.max(0, pElec) * dt;

    points.push({
      t,
      s,
      v,
      i: k1.i,
      pwm: k1.pwm,
      alphaRad: k1.alpha,
      pElec,
      eElec: eJ,
    });

    s = sNext;
    v = vNext;
    t += dt;

    if (points.length > 5 && v === 0 && k1.pwm === 0) break;
  }

  const totalTime = points.length ? points[points.length - 1].t : 0;
  const totalDistance = points.length ? points[points.length - 1].s : 0;
  const totalEnergyJ = points.length ? points[points.length - 1].eElec : 0;
  const vAvg = totalTime > 0 ? totalDistance / totalTime : 0;

  return { points, totalTime, totalDistance, totalEnergyJ, vAvg };
}
