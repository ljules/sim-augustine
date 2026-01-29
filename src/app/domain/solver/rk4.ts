// Import des types :
import type { SyStateFn, StepResult } from './types-solver';

/**
 * Un pas RK4 (dt fixe).
 * Remarque: deriv() dépend de s (via strategy/circuit), donc on rappelle deriv à chaque évaluation.
 */
export function rk4Step(
    t: number,
    s: number,
    v: number,
    dt: number,
    syStateFn: SyStateFn
): StepResult {
    //Calcul de k1 :
    const k1 = syStateFn(t, s, v);

    //Calcul de k2 : 
    const t2 = t + 0.5 * dt;
    const s2 = s + 0.5 * dt * k1.ds;
    const v2 = Math.max(0, v + 0.5 * dt * k1.dv);
    const k2 = syStateFn(t2, s2, v2);

    //Calcul de k3 :
    const t3 = t + 0.5 * dt;
    const s3 = s + 0.5 * dt * k2.ds;
    const v3 = Math.max(0, v + 0.5 * dt * k2.dv);
    const k3 = syStateFn(t3, s3, v3);

    //Calcul de k4 :
    const t4 = t + dt;
    const s4 = s + dt * k3.ds;
    const v4 = Math.max(0, v + dt * k3.dv);
    const k4 = syStateFn(t4, s4, v4);

    // Calcul des valeurs à partir des pondérations k1, k2, k3 et k4 :
    const sNext = s + (dt / 6) * (k1.ds + 2 * k2.ds + 2 * k3.ds + k4.ds);
    const vNext = Math.max(0, v + (dt / 6) * (k1.dv + 2 * k2.dv + 2 * k3.dv + k4.dv));

    //Calcul de la puissance :
    const p1 = Math.max(0, k1.i * k1.u_mot);
    const p2 = Math.max(0, k2.i * k2.u_mot);
    const p3 = Math.max(0, k3.i * k3.u_mot);
    const p4 = Math.max(0, k4.i * k4.u_mot);
    const pElecAvg = (p1 + 2 * p2 + 2 * p3 + p4) / 6;


    return { sNext, vNext, iStep: k1.i, context: k1, pElecAvg };
}
