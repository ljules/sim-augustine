// Import des types :
import type { SyStateFn, StepResult } from './types-solver';


/**
 * Un pas Euler (dt fixe). Modèle "sans inductance" au niveau du véhicule (dépend de DerivFn).
 */
export function eulerStep(
    t: number,
    s: number,
    v: number,
    dt: number,
    syStateFn: SyStateFn
): StepResult {    
    const k1 = syStateFn(t, s, v);

    // intégration Euler :
    const sNext = s + k1.ds * dt;
    const vNext = Math.max(0, v + k1.dv * dt);
    const pElecAvg = Math.max(0, k1.i * k1.u_mot)

    return { sNext, vNext, iStep: k1.i, context: k1, pElecAvg };
}
