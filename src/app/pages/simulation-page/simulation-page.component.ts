import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';


import { CircuitStoreService } from '../../core/services/circuit-store.service';
import { StrategyStoreService } from '../../core/services/strategy-store.service';
import { VehicleStoreService } from '../../core/services/vehicle-store.service';

import { Circuit } from '../../domain/circuit/circuit';
import { Motor } from '../../domain/vehicle/motor';
import { Vehicle } from '../../domain/vehicle/vehicle';

import { IntervalStrategy } from '../../domain/strategy/interval-strategy';
import { simulateEulerIntervals, simulateRK4Intervals } from '../../domain/simulation/simulate-intervals';
import { SimResult } from '../../domain/types';

import { SpeedChartComponent } from '../../shared/components/speed-chart/speed-chart.component';


@Component({
  selector: 'app-simulation-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SpeedChartComponent],
  templateUrl: './simulation-page.component.html',
  styleUrl: './simulation-page.component.css'
})


export class SimulationPageComponent {
  dt = 0.2;
  tMax = 400;

  lastMethod: 'Euler' | 'RK4' | null = null;
  result: SimResult | null = null;
  error: string | null = null;

  constructor(
    private circuitStore: CircuitStoreService,
    private vehicleStore: VehicleStoreService,
    private strategyStore: StrategyStoreService
  ) {}

  simulate(method: 'Euler' | 'RK4'): void {
    this.error = null;
    this.result = null;
    this.lastMethod = null;

    const circuitProfile = this.circuitStore.getCircuit();
    if (!circuitProfile) {
      this.error = 'Aucun circuit chargé. Va sur la page Circuit.';
      return;
    }

    const vehicleCfg = this.vehicleStore.get(); // à adapter à ton store existant
    const strategyCfg = this.strategyStore.get();

    try {
      const circuit = new Circuit(circuitProfile);
      const motor = new Motor(vehicleCfg.motor);   // dépend de ton modèle de VehicleStore
      const vehicle = new Vehicle(vehicleCfg.vehicle, motor);

      const strategy = new IntervalStrategy(strategyCfg);

    const res =
    method === 'Euler'
        ? simulateEulerIntervals(circuit, vehicle, strategy, this.dt, this.tMax)
        : simulateRK4Intervals(circuit, vehicle, strategy, this.dt, this.tMax);

      this.result = res;
      this.lastMethod = method;
    } catch (e: any) {
      this.error = e?.message ?? 'Erreur simulation inconnue';
    }
  }

  get energyWh(): number | null {
    if (!this.result) return null;
    return this.result.totalEnergyJ / 3600;
  }
}