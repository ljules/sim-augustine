// Import des classes :
import { Circuit } from '../circuit/circuit';
import { Vehicle } from '../vehicle/vehicle';
import { IntervalStrategy } from '../strategy/interval-strategy';


// Import des types :
import { SimPoint, SimResult } from '../types';
import type { SyStateFn, StepResult } from '../solver/types-solver';
import { eulerStep } from '../solver/euler';
import { rk4Step } from '../solver/rk4';


// Définition de la fonction de calcul d'étape du système :
type StepFn = (s: number, v: number, dt: number, syStateFn: SyStateFn) => StepResult;




/** 
* Calcul les variables d'environnement 
* et élabore de la fonction d'état du système.
*/
function buildDeriv(
    circuit: Circuit,                                  // Objet donnant l'altitude z(s) et la pente alphaRad(s)
    vehicle: Vehicle,                                  // Objet fournissant la méthode de calcul des dérivées : dv_dt; dx_dt et i
    strategy: IntervalStrategy                         // Objet contenant la liste des valeur PWM (consignes pilotes) du moteur
): SyStateFn {

    // Calcul des variable d'environnement du système :
   

    // Fonction lambda d'interface (réceptionne la position et la vitesse) :
    return (sLocal: number, vLocal: number) => {
        const alpha = circuit.alphaAt(sLocal);          // Récupération de l'angle de pente alpha
        const pwm = strategy.pwmForDistance(sLocal);    // Récupération de la valeur de PWM
        const Vmax = vehicle.motor.cfg.maxVoltage;      // Tension maxi aux bornes du moteur (Ubat)
        const u_mot = pwm * Vmax;                       // Calcul de la tension appliquée aux bornes du moteur

        // Appel de la fonction de calcul du système : 
        const { dv_dt, dx_dt, i } = vehicle.stepNoInductance(u_mot, alpha, vLocal);

        // Retour de l'ensemble des valeurs calculées via le retour de la fonction lambda :
        return { ds: dx_dt, dv: dv_dt, alpha, pwm, u_mot, i };
    };
}


// Fonction de calcul des grandeurs finales de la simulation :
function finalize(points: SimPoint[]): SimResult {
    // Calcul des valeurs générales de la simulation :
    const totalTime = points.length ? points[points.length - 1].t : 0;
    const totalDistance = points.length ? points[points.length - 1].s : 0;
    const totalEnergyJ = points.length ? points[points.length - 1].eElec : 0;
    const vAvg = totalTime > 0 ? totalDistance / totalTime : 0;

    // Retour des points calculés et valeurs générales :
    return { points, totalTime, totalDistance, totalEnergyJ, vAvg };
}


// Fonction de calcule de la simulation :
function simulateFixedDt(
    circuit: Circuit,
    vehicle: Vehicle,
    strategy: IntervalStrategy,
    dt: number,
    tMax: number,
    stepFn: StepFn
): SimResult {
    const points: SimPoint[] = [];

    let t = 0;      // Date (s)
    let s = 0;      // Position (m)
    let v = 0;      // Vitesse (m/s)
    let eJ = 0;     // Energie (J)

    const sEnd = circuit.maxDistance();                          // Récupération de la position finale
    const syStateFn = buildDeriv(circuit, vehicle, strategy);    // Récupération la fonction d'état du système


    // BOUCLE DE SIMULATION :
    while (t <= tMax && s < sEnd) {
        const { sNext, vNext, iStep, context } = stepFn(s, v, dt, syStateFn);

        // Energie : on prend la puissance du point courant en approximation :
        const pElec = iStep * context.u_mot;
        eJ += Math.max(0, pElec) * dt;

        // Enregistrement des résultats du pas de calcul :
        points.push({
            t,
            s,
            v,
            i: iStep,
            pwm: context.pwm,
            alphaRad: context.alpha,
            pElec,
            eElec: eJ,
        });

        // Valeurs t, s et v pour le pas de calcul suivant :
        s = sNext;
        v = vNext;
        t += dt;
    }

    return finalize(points);
}


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
    return simulateFixedDt(circuit, vehicle, strategy, dt, tMax, eulerStep);
}

/**
 * RK4 dt fixe, modèle sans inductance.
 */
export function simulateRK4Intervals(
    circuit: Circuit,
    vehicle: Vehicle,
    strategy: IntervalStrategy,
    dt: number,
    tMax: number
): SimResult {
    return simulateFixedDt(circuit, vehicle, strategy, dt, tMax, rk4Step);
}
