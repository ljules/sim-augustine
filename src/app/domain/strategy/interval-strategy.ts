import { Interval, StrategyConfig } from '../types';

export class IntervalStrategy {
    constructor(private cfg: StrategyConfig) { }

 

    private findIntervalAtDistance(s: number): Interval | null {
        return this.cfg.intervals.find(iv => s >= iv.d && s <= iv.f) ?? null;
    }
 

    /**
     * Test si la position s est située dans un intervalle d'accélération.
     * @param s - Position linéaire (m) sur le circuit
     * @returns true si la position s est située dans l'un des
     * intervalles d'accélération du moteur.
     */
    isOnAtDistance(s: number): boolean {
        return this.findIntervalAtDistance(s) !== null;
    }


    /**
     * Génère la rampe d'accélération :
     * 0 avant la date d'accélération
     * Valeur proportionnelle si dans l'intervalle de la rampe d'accélération
     * 1 après avoir atteint et dépassé la durée de la rampe.
     * @param tOnElapsed - Temps écoulé (s)
     * @returns La valeur PWM entre 0 et 1.
     */
    private pwmOnForElapsed(tOnElapsed: number, dtSlope: number): number {
        
        // Si dtSlope est nul, alors c'est une commande TOR (tout ou rien), PWM est directement à 1  :
        if (dtSlope <= 0) return 1;

        const pwm = tOnElapsed / dtSlope;
        return Math.max(0, Math.min(1, pwm))
    }


    /**
     * Méthode principale qui détermine si la position s correspond
     * à un intervalle de pilotage du moteur. Endehors d'un intervalle
     * de pilotage PWM est à 0. Si la position s tombe dans un 
     * intervalle de pilote, la méthode calcul la valeur de PWM à 
     * partir de la date courant t (s) et de la date d'enclenchement
     * de la rampe tOnStart (s).
     * @param t - Date absolue (s) du point de calcul de la simulation.
     * @param s - Position courante (m) du véhicule dans la simulation.
     * @param tOnStart - Date absolue (s) correspondant au début de
     * l'intervalle de pilotage du moteur.
     * @returns La valeur de 0 à 1 du signal PWM.
     */
    pwmFor(t: number, s: number, tOnStart: number | null): number {
        const iv = this.findIntervalAtDistance(s);
        if (!iv) return 0;
        if (tOnStart === null) return 0;

        return this.pwmOnForElapsed(t - tOnStart, iv.dtSlope);
    }

}
