import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';


import { VehicleStoreService } from '../../core/services/vehicle-store.service';
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
    this.message = 'Valeurs par défaut (Python) restaurées.';
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

  private autoClearMessage(): void {
    window.setTimeout(() => (this.message = null), 2500);
  }

  private clone<T>(x: T): T {
    // structuredClone dispo dans les navigateurs modernes
    return structuredClone(x);
  }
}