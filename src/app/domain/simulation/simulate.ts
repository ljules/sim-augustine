import { Circuit } from '../circuit/circuit';
import { Motor } from '../vehicle/motor';
import { Vehicle } from '../vehicle/vehicle';
import { SimPoint, SimResult } from '../types';
import { OnOffStrategy } from '../strategy/onoff';

type State = { s: number; v: number; e: number }; // position, vitesse, énergie cumulée

export function simulateEuler(
  circuit: Circuit,
  vehicle: Vehicle,
  motor: Motor,
  strategy: OnOffStrategy,
  dt: number,
  tMax: number
): SimResult {
  strategy.reset();

  const points: SimPoint[] = [];
  let t = 0;
  let st: State = { s: 0, v: 0, e: 0 };

  const sEnd = circuit.maxDistance();

  while (t <= tMax && st.s < sEnd) {
    const alpha = circuit.alphaAt(st.s);
    const pwm = strategy.pwmFor(st.v);

    const { i, tauWheel } = motor.compute(pwm, st.v, (vehicle as any).cfg?.wheelRadiusM ?? 0.25);
    const a = vehicle.accel(st.v, tauWheel, alpha);

    const vNext = Math.max(0, st.v + a * dt);
    const sNext = st.s + st.v * dt; // Euler explicite
    const Vmax = (motor as any).cfg?.maxVoltage ?? 0;
    const pElec = i * (pwm * Vmax);
    const eNext = st.e + Math.max(0, pElec) * dt;

    points.push({
      t, s: st.s, v: st.v, i, pwm,
      alphaRad: alpha,
      pElec,
      eElec: st.e,
    });

    st = { s: sNext, v: vNext, e: eNext };
    t += dt;
  }

  const totalTime = points.length ? points[points.length - 1].t : 0;
  const totalDistance = points.length ? points[points.length - 1].s : 0;
  const totalEnergyJ = points.length ? points[points.length - 1].eElec : 0;
  const vAvg = totalTime > 0 ? totalDistance / totalTime : 0;

  return { points, totalTime, totalDistance, totalEnergyJ, vAvg };
}

/**
 * RK4 sur l’état (s,v). Énergie estimée sur le pas (moyenne simple).
 * Pour MVP: on garde le calcul moteur "quasi-statique".
 */
export function simulateRK4(
  circuit: Circuit,
  vehicle: Vehicle,
  motor: Motor,
  strategy: OnOffStrategy,
  dt: number,
  tMax: number
): SimResult {
  strategy.reset();

  const points: SimPoint[] = [];
  let t = 0;
  let s = 0;
  let v = 0;
  let e = 0;

  const sEnd = circuit.maxDistance();

  const deriv = (sLocal: number, vLocal: number) => {
    const alpha = circuit.alphaAt(sLocal);
    const pwm = strategy.pwmFor(vLocal);
    const { i, tauWheel } = motor.compute(pwm, vLocal, (vehicle as any).cfg?.wheelRadiusM ?? 0.25);
    const a = vehicle.accel(vLocal, tauWheel, alpha);
    return { ds: vLocal, dv: a, alpha, pwm, i };
  };

  while (t <= tMax && s < sEnd) {
    // dérivées RK4 (attention: la stratégie a de l’état => pour MVP on l’applique sur v "courant"
    // et on accepte la petite approximation. On rendra la stratégie "pure" plus tard si besoin.)
    const k1 = deriv(s, v);
    const k2 = deriv(s + 0.5 * dt * k1.ds, v + 0.5 * dt * k1.dv);
    const k3 = deriv(s + 0.5 * dt * k2.ds, v + 0.5 * dt * k2.dv);
    const k4 = deriv(s + dt * k3.ds, v + dt * k3.dv);

    const sNext = s + (dt / 6) * (k1.ds + 2 * k2.ds + 2 * k3.ds + k4.ds);
    const vNext = Math.max(0, v + (dt / 6) * (k1.dv + 2 * k2.dv + 2 * k3.dv + k4.dv));

    // puissance/énergie (approx) sur base k1
    const Vmax = (motor as any).cfg?.maxVoltage ?? 0;
    const pElec = k1.i * (k1.pwm * Vmax);
    e += Math.max(0, pElec) * dt;

    points.push({
      t, s, v, i: k1.i, pwm: k1.pwm,
      alphaRad: k1.alpha,
      pElec,
      eElec: e,
    });

    s = sNext;
    v = vNext;
    t += dt;
  }

  const totalTime = points.length ? points[points.length - 1].t : 0;
  const totalDistance = points.length ? points[points.length - 1].s : 0;
  const totalEnergyJ = points.length ? points[points.length - 1].eElec : 0;
  const vAvg = totalTime > 0 ? totalDistance / totalTime : 0;

  return { points, totalTime, totalDistance, totalEnergyJ, vAvg };
}
