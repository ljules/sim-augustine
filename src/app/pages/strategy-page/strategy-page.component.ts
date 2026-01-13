import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { StrategyTimelineComponent, Interval } from '../../shared/components/strategy-timeline/strategy-timeline.component';
import { StrategyStoreService } from '../../core/services/strategy-store.service';
import { CircuitStoreService } from '../../core/services/circuit-store.service';
import { StrategyConfig } from '../../domain/types';


@Component({
  selector: 'app-strategy-page',
  standalone: true,
  imports: [CommonModule, FormsModule, StrategyTimelineComponent],
  templateUrl: './strategy-page.component.html',
  styleUrl: './strategy-page.component.css'
})


export class StrategyPageComponent {
  distanceMax = 1000;

  cfg: StrategyConfig;

  constructor(
    private strategyStore: StrategyStoreService,
    private circuitStore: CircuitStoreService
  ) {
    this.cfg = this.strategyStore.get();

    const circuit = this.circuitStore.getCircuit();
    if (circuit) this.distanceMax = circuit.s[circuit.s.length - 1];
  }

  onIntervalsChange(intervals: Interval[]): void {
    this.cfg = { ...this.cfg, intervals };
    this.strategyStore.set(this.cfg);
  }

  save(): void {
    this.strategyStore.set(this.cfg);
  }
}
