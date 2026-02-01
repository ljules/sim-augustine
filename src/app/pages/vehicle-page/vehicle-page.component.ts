import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';


import { VehicleStoreService } from '../../services/vehicle-store.service';
import { VehicleFullConfig } from '../../domain/types';

const TWO_PI = 2 * Math.PI;


@Component({
  selector: 'app-vehicle-page',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './vehicle-page.component.html',
  styleUrl: './vehicle-page.component.css'
})


export class VehiclePageComponent {

  cfg: VehicleFullConfig;
  message: string | null = null;

  constructor(private store: VehicleStoreService) {
    this.cfg = this.clone(this.store.get());
  }
 
  save(): void {
    // petit nettoyage + cohérence
    this.recomputeKeIfNeeded();

    // On s’assure juste que les dents sont valides avant persistance
    this.cfg.vehicle.z_pignon = this.clampPositiveInt(this.cfg.vehicle.z_pignon, 13);
    this.cfg.vehicle.z_couronne = this.clampPositiveInt(this.cfg.vehicle.z_couronne, 210);

    this.onTeethChanged();
    
    this.store.set(this.clone(this.cfg));
    this.message = 'Configuration enregistrée.';
    this.autoClearMessage();
  }

  reload(): void {
    this.cfg = this.clone(this.store.get());
    this.message = 'Configuration rechargée depuis le stockage.';
    this.autoClearMessage();
  }

  resetDefaults(): void {
    this.store.clear();
    this.cfg = this.clone(this.store.get()); // revient aux défauts Python
    this.message = 'Valeurs par défaut restaurées.';
    this.autoClearMessage();
  }

  // Appelé quand ku change dans le formulaire
  onKuChanged(): void {
    const ku = this.cfg.motor.kuRpmPerV;
    if (Number.isFinite(ku) && ku > 0) {
      this.cfg.motor.ke = 60 / (ku * TWO_PI);
    }
  }

  private recomputeKeIfNeeded(): void {
    // assure ke cohérent avec ku (même si l'utilisateur a modifié ke à la main)
    const ku = this.cfg.motor.kuRpmPerV;
    if (Number.isFinite(ku) && ku > 0) {
      this.cfg.motor.ke = 60 / (ku * TWO_PI);
    }
  }

  // Rapport dérivé
  get r_red(): number {
    const zc = this.cfg.vehicle.z_couronne;
    const zp = this.cfg.vehicle.z_pignon;
    if (!Number.isFinite(zc) || !Number.isFinite(zp) || zc <= 0 || zp <= 0) return 0;
    return zc / zp;
  }
  
  // Pour afficher r_red avec un arrondi :
  get r_red_display(): number {
    const r = this.cfg.vehicle.r_red;
    if (!Number.isFinite(r)) return 0;
    return Math.round(r * 1000) / 1000; // 3 décimales
  }


  // Mise à jour des dents de la  transmission :
  onTeethChanged(): void {
   // sécurise les valeurs (évite NaN / 0)
   this.cfg.vehicle.z_pignon = this.clampPositiveInt(this.cfg.vehicle.z_pignon, 13);
   this.cfg.vehicle.z_couronne = this.clampPositiveInt(this.cfg.vehicle.z_couronne, 210);

   // sync du champ stocké (utile si ailleurs tu lis cfg.vehicle.r_red)
   this.cfg.vehicle.r_red = this.r_red;
  }



  private clampPositiveInt(value: unknown, fallback: number): number {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return fallback;
    const i = Math.trunc(n);
    return i > 0 ? i : fallback;
  }

  private autoClearMessage(): void {
    window.setTimeout(() => (this.message = null), 2500);
  }

  private clone<T>(x: T): T {
    // structuredClone dispo dans les navigateurs modernes
    return structuredClone(x);
  }
}