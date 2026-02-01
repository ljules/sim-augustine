import { Injectable } from '@angular/core';
import { MotorConfig, VehicleConfig, VehicleFullConfig } from '../domain/types';

const KEY = 'vehicleFullConfig';
const TWO_PI = 2 * Math.PI;

// Défauts = ton code Python
const DEFAULT_MOTOR: MotorConfig = {
  kuRpmPerV: 102,
  ke: 60 / (102 * TWO_PI),      // ke = 60/(ku*2*pi)
  kc: Math.round((93.4 / 1000)*10000)/10000,
  rm: 0.608,
  lm: 0.423e-3,
  jm: 542e-7,
  fvm: 1.609e-5,
  cs: 0.0,
  maxVoltage: 48,               // Maxon RE50 48V
};


const DEFAULT_Z_PIGNON = 13;
const DEFAULT_Z_COURONNE = 210;

const DEFAULT_VEHICLE: VehicleConfig = {
  m: 80.0,
  g: 9.81,
  fs: 0.002,
  rho: 1.21,
  s: 0.656,
  cx: 0.0632,
  z_pignon: DEFAULT_Z_PIGNON,
  z_couronne: DEFAULT_Z_COURONNE,  
  r_red: DEFAULT_Z_COURONNE / DEFAULT_Z_PIGNON,
  r_roue: 0.480 / 2,
  fv: 0.0,
};

const DEFAULT_FULL: VehicleFullConfig = {
  motor: DEFAULT_MOTOR,
  vehicle: DEFAULT_VEHICLE,
};

@Injectable({ providedIn: 'root' })
export class VehicleStoreService {
  private cache: VehicleFullConfig | null = null;

  /** Récupère la config (localStorage si présent, sinon défaut Python) */
  get(): VehicleFullConfig {
    if (this.cache) return this.cache;

    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as VehicleFullConfig;
        // merge défensif pour éviter les clés manquantes si tu changes le modèle plus tard
        this.cache = this.mergeWithDefaults(parsed);
        return this.cache;
      } catch {
        // si JSON invalide -> on repart sur défaut
      }
    }

    this.cache = structuredClone(DEFAULT_FULL);
    return this.cache;
  }

  /** Sauvegarde dans localStorage */
  set(cfg: VehicleFullConfig): void {
    this.cache = cfg;
    localStorage.setItem(KEY, JSON.stringify(cfg));
  }

  /** Reset */
  clear(): void {
    this.cache = null;
    localStorage.removeItem(KEY);
  }

  // --------------------
  // Helpers
  // --------------------
  private mergeWithDefaults(cfg: Partial<VehicleFullConfig>): VehicleFullConfig {
    const m = cfg.motor ?? {};
    const v = cfg.vehicle ?? {};

    const motor: MotorConfig = {
      ...DEFAULT_MOTOR,
      ...m,
    };

    // si ku a été modifié, recalc ke si ke absent
    if ((m as any).kuRpmPerV != null && (m as any).ke == null) {
      motor.ke = 60 / (motor.kuRpmPerV * TWO_PI);
    }

    const vehicle: VehicleConfig = {
      ...DEFAULT_VEHICLE,
      ...v,
    };

    return { motor, vehicle };
  }
}
