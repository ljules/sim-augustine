import { CircuitProfile } from '../types';

export class Circuit {
  constructor(private profile: CircuitProfile) {}

  // interpolation linéaire altitude(s)
  altitudeAt(s: number): number {
    const { s: xs, z: zs } = this.profile;
    if (s <= xs[0]) return zs[0];
    const last = xs.length - 1;
    if (s >= xs[last]) return zs[last];

    // recherche linéaire simple (OK MVP). On optimisera (binaire) si besoin.
    let k = 0;
    while (k < last && xs[k + 1] < s) k++;

    const s0 = xs[k], s1 = xs[k + 1];
    const z0 = zs[k], z1 = zs[k + 1];
    const u = (s - s0) / (s1 - s0);
    return z0 + u * (z1 - z0);
  }

  // pente alpha (rad) via dérivée d'altitude: dz/ds ~ (z(s+ds)-z(s-ds))/2ds
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
