import { CircuitProfile } from '../types';

export class Circuit {
    constructor(private profile: CircuitProfile) { }

    // Interpolation linéaire altitude(s) :
    altitudeAt(s: number): number {
        // Sécurisation des valeurs extrêmes s(0) et s(fin) :
        const { s: xs, z: zs } = this.profile;
        if (s <= xs[0]) return zs[0];
        const last = xs.length - 1;
        if (s >= xs[last]) return zs[last];

        // Recherche linéaire simple (OK MVP). On optimisera (binaire) si besoin.
        
        // Recherche de l'intervalle k k+1 pour appliquer la linéarisation :
        let k = 0;
        while (k < last && xs[k + 1] < s) k++;

        const s0 = xs[k], s1 = xs[k + 1];      // Position de départ s0 et de fin s1 de l'intervalle
        const z0 = zs[k], z1 = zs[k + 1];      // Altitude de départ z0 et de fin z1 de l'intervalle 
        const u = (s - s0) / (s1 - s0);        // Calcul de taux de position sur l'intervalle relatif
        return z0 + u * (z1 - z0);             // Calcul et retour de l'altitude absolue
    }

    // Pente alpha (rad) via dérivée d'altitude: dz/ds ~ (z(s+ds)-z(s-ds))/2ds
    alphaAt(s: number, ds = 0.5): number {
        const zPlus = this.altitudeAt(s + ds);
        const zMinus = this.altitudeAt(s - ds);
        const dzds = (zPlus - zMinus) / (2 * ds);
        return Math.atan(dzds);
    }

    maxDistance(): number {
        const xs = this.profile.s;
        return xs[xs.length - 1];
    }
}
