// Import des types :
import type { SyStateFn, StepResult } from './types-solver';

/**
 * Un pas RK4 (dt fixe).
 * Remarque: deriv() dépend de s (via strategy/circuit), donc on rappelle deriv à chaque évaluation.
 */
export function rk4Step(
    s: number,
    v: number,
    dt: number,
    syStateFn: SyStateFn
): StepResult {

    // Calcul des coefficients RK4 :
    const k1 = syStateFn(s, v);
    const k2 = syStateFn(s + 0.5 * dt * k1.ds, v + 0.5 * dt * k1.dv);
    const k3 = syStateFn(s + 0.5 * dt * k2.ds, v + 0.5 * dt * k2.dv);
    const k4 = syStateFn(s + dt * k3.ds, v + dt * k3.dv);

    // Intégration des valeurs avec pondération RK4 :
    const sNext = s + (dt / 6) * (k1.ds + 2 * k2.ds + 2 * k3.ds + k4.ds);
    const vNext = Math.max(0, v + (dt / 6) * (k1.dv + 2 * k2.dv + 2 * k3.dv + k4.dv));

    return { sNext, vNext, iStep: k1.i, context: k1 };
}
