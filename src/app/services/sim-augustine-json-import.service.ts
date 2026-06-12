import { Injectable } from '@angular/core';

import { CircuitStoreService } from './circuit-store.service';
import { RaceSessionStoreService } from './race-session-store.service';
import { VehicleStoreService } from './vehicle-store.service';
import type {
  CircuitProfile,
  Interval,
  IntervalColor,
  RaceSessionConfig,
  StrategyConfig,
  VehicleFullConfig,
} from '../domain/types';
import type {
  ExportLapStrategy,
  SimAugustineExportJson,
} from '../domain/export/export-json';

@Injectable({
  providedIn: 'root'
})
export class SimAugustineJsonImportService {
  constructor(
    private circuitStore: CircuitStoreService,
    private vehicleStore: VehicleStoreService,
    private raceSessionStore: RaceSessionStoreService
  ) { }

  importFromJsonText(text: string): void {
    let parsed: unknown;

    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('Import impossible : le fichier JSON est invalide.');
    }

    this.importPayload(parsed);
  }

  importPayload(payload: unknown): void {
    const data = payload as Partial<SimAugustineExportJson> | null;

    this.validateRoot(data);

    const circuit = this.buildCircuitProfile(data.circuit);
    const vehicle = this.buildVehicleConfig(data.vehicle);
    const session = this.buildRaceSessionConfig(data.session);

    this.circuitStore.setCircuit(circuit);
    this.vehicleStore.set(vehicle);
    this.raceSessionStore.set(session);
    this.raceSessionStore.clearResults();
  }

  private validateRoot(data: Partial<SimAugustineExportJson> | null): asserts data is SimAugustineExportJson {
    if (!data || typeof data !== 'object') {
      throw new Error('Import impossible : le contenu JSON ne correspond pas a un export Sim-Augustine.');
    }

    if (data.schemaVersion !== '1.0.0') {
      throw new Error(`Import impossible : schemaVersion non supportee (${String(data.schemaVersion ?? 'absente')}).`);
    }

    if (data.appName !== 'Sim-Augustine') {
      throw new Error(`Import impossible : appName non supporte (${String(data.appName ?? 'absent')}).`);
    }

    if (!data.circuit?.points || !Array.isArray(data.circuit.points)) {
      throw new Error('Import impossible : circuit.points est absent ou invalide.');
    }

    if (data.circuit.points.length < 2) {
      throw new Error('Import impossible : le circuit doit contenir au moins deux points.');
    }

    if (!data.vehicle?.vehicleConfig || !data.vehicle?.motorConfig) {
      throw new Error('Import impossible : configuration vehicule ou moteur absente.');
    }

    if (!data.session?.startLapStrategy || !data.session?.raceLapStrategy) {
      throw new Error('Import impossible : strategies de session absentes.');
    }

    if (!Number.isFinite(Number(data.session.totalLaps)) || Number(data.session.totalLaps) < 2) {
      throw new Error('Import impossible : totalLaps doit etre superieur ou egal a 2.');
    }
  }

  private buildCircuitProfile(circuit: SimAugustineExportJson['circuit']): CircuitProfile {
    const points = [...circuit.points].sort((a, b) => a.sM - b.sM);

    for (let i = 0; i < points.length; i++) {
      const p = points[i];

      if (!Number.isFinite(Number(p.sM)) || !Number.isFinite(Number(p.zM))) {
        throw new Error('Import impossible : les points circuit doivent contenir sM et zM numeriques.');
      }

      if (i > 0 && points[i].sM <= points[i - 1].sM) {
        throw new Error('Import impossible : les distances sM du circuit doivent etre strictement croissantes.');
      }
    }

    return {
      name: circuit.name || 'Circuit importe',
      s: points.map(p => Number(p.sM)),
      z: points.map(p => Number(p.zM)),
      lat: points.map(p => Number.isFinite(Number(p.lat)) ? Number(p.lat) : NaN),
      lon: points.map(p => Number.isFinite(Number(p.lon)) ? Number(p.lon) : NaN),
      utmX: points.map(p => Number.isFinite(Number(p.utmX)) ? Number(p.utmX) : NaN),
      utmY: points.map(p => Number.isFinite(Number(p.utmY)) ? Number(p.utmY) : NaN),
    };
  }

  private buildVehicleConfig(vehicle: SimAugustineExportJson['vehicle']): VehicleFullConfig {
    return {
      vehicle: vehicle.vehicleConfig,
      motor: vehicle.motorConfig,
    };
  }

  private buildRaceSessionConfig(session: SimAugustineExportJson['session']): RaceSessionConfig {
    return {
      totalLaps: Math.max(2, Math.floor(Number(session.totalLaps))),
      startLapStrategy: this.buildStrategyConfig(session.startLapStrategy),
      raceLapStrategy: this.buildStrategyConfig(session.raceLapStrategy),
    };
  }

  private buildStrategyConfig(strategy: ExportLapStrategy): StrategyConfig {
    return {
      pwmOn: this.safeNumber(strategy.pwmOn, 1),
      vInit: this.safeNumber(strategy.vInitKmh, 0),
      defaultDtSlope: this.safeNumber(strategy.defaultDtSlopeS, 0),
      defaultColor: this.normalizeColor(strategy.defaultButtonColor, 'yellow'),
      intervals: this.buildIntervals(strategy),
    };
  }

  private buildIntervals(strategy: ExportLapStrategy): Interval[] {
    if (!Array.isArray(strategy.intervals)) {
      throw new Error('Import impossible : une strategie contient une liste intervals invalide.');
    }

    return strategy.intervals.map(iv => ({
      d: this.safeNumber(iv.startDistanceM, 0),
      f: this.safeNumber(iv.endDistanceM, 0),
      dtSlope: this.safeNumber(iv.dtSlopeS, this.safeNumber(strategy.defaultDtSlopeS, 0)),
      color: this.normalizeColor(iv.buttonColor, this.normalizeColor(strategy.defaultButtonColor, 'yellow')),
    }));
  }

  private safeNumber(value: unknown, fallback: number): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  private normalizeColor(raw: unknown, fallback: IntervalColor): IntervalColor {
    const v = String(raw ?? '').toLowerCase();
    if (v === 'red') return 'green';
    if (v === 'yellow' || v === 'green' || v === 'blue') return v;
    return fallback;
  }
}
