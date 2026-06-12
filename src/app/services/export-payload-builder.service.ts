import { Injectable } from '@angular/core';

import { CircuitStoreService } from './circuit-store.service';
import { RaceSessionStoreService } from './race-session-store.service';
import { VehicleStoreService } from './vehicle-store.service';
import { getRemainingRaceLaps } from '../domain/session/race-session';
import type {
  CircuitProfile,
  RaceSessionConfig,
  SimPoint,
  SimResult,
  StrategyConfig,
  VehicleFullConfig,
} from '../domain/types';
import type {
  ExportCircuit,
  ExportCircuitPoint,
  ExportGhost,
  ExportGhostPoint,
  ExportLapSimulationResult,
  ExportLapStrategy,
  ExportMetadata,
  ExportSessionSimulationResult,
  ExportSimulation,
  ExportStrategyInterval,
  ExportUnits,
  SimAugustineExportJson,
} from '../domain/export/export-json';

export type ExportPayloadBuilderInput = {
  circuit: CircuitProfile;
  vehicle: VehicleFullConfig;
  session: RaceSessionConfig;
  startLapResult?: SimResult | null;
  raceLapResult?: SimResult | null;
  createdAt?: string;
  solver?: 'Euler' | 'RK4' | string;
  dtS?: number;
  ghostStepS?: number;
  metadata?: Partial<ExportMetadata>;
};

const EXPORT_UNITS: ExportUnits = {
  distance: 'm',
  time: 's',
  speed: 'm/s',
  energy: 'J',
  current: 'A',
  pwm: 'ratio_0_1',
  altitude: 'm',
  voltage: 'V',
  angle: 'rad',
};

@Injectable({
  providedIn: 'root'
})
export class ExportPayloadBuilderService {
  private readonly DEFAULT_GHOST_STEP_S = 0.5;

  constructor(
    private circuitStore: CircuitStoreService,
    private vehicleStore: VehicleStoreService,
    private raceSessionStore: RaceSessionStoreService
  ) { }

  buildFromCurrentState(): SimAugustineExportJson {
    const circuit = this.circuitStore.getCircuit();
    if (!circuit) {
      throw new Error('Impossible de construire l export : aucun circuit charge.');
    }

    return this.build({
      circuit,
      vehicle: this.vehicleStore.get(),
      session: this.raceSessionStore.get(),
      startLapResult: this.raceSessionStore.getStartLapResult(),
      raceLapResult: this.raceSessionStore.getRaceLapResult(),
    });
  }

  build(input: ExportPayloadBuilderInput): SimAugustineExportJson {
    const remainingRaceLaps = getRemainingRaceLaps(input.session.totalLaps);
    const simulation = this.buildSimulation(input.startLapResult, input.raceLapResult, remainingRaceLaps, input);
    const ghost = this.buildGhost(
      input.startLapResult,
      input.raceLapResult,
      input.ghostStepS ?? this.DEFAULT_GHOST_STEP_S,
      input.circuit
    );

    const payload: SimAugustineExportJson = {
      schemaVersion: '1.0.0',
      appName: 'Sim-Augustine',
      createdAt: input.createdAt ?? new Date().toISOString(),
      units: EXPORT_UNITS,
      circuit: this.buildCircuit(input.circuit),
      vehicle: {
        vehicleConfig: input.vehicle.vehicle,
        motorConfig: input.vehicle.motor,
      },
      session: {
        totalLaps: input.session.totalLaps,
        remainingRaceLaps,
        startLapStrategy: this.buildStrategy(input.session.startLapStrategy),
        raceLapStrategy: this.buildStrategy(input.session.raceLapStrategy),
      },
      metadata: {
        exportedBy: 'Sim-Augustine',
        compatibility: {
          androGustineMinSchema: '1.0.0',
          simAugustineMinSchema: '1.0.0',
        },
        ...input.metadata,
      },
    };

    if (simulation) payload.simulation = simulation;
    if (ghost) payload.ghost = ghost;

    return payload;
  }

  private buildCircuit(circuit: CircuitProfile): ExportCircuit {
    const n = Math.min(circuit.s.length, circuit.z.length);
    const points: ExportCircuitPoint[] = [];

    for (let i = 0; i < n; i++) {
      const point: ExportCircuitPoint = {
        sM: circuit.s[i],
        zM: circuit.z[i],
      };

      if (Number.isFinite(circuit.lat?.[i])) point.lat = circuit.lat[i];
      if (Number.isFinite(circuit.lon?.[i])) point.lon = circuit.lon[i];
      if (Number.isFinite(circuit.utmX?.[i])) point.utmX = circuit.utmX[i];
      if (Number.isFinite(circuit.utmY?.[i])) point.utmY = circuit.utmY[i];

      points.push(point);
    }

    return {
      name: circuit.name,
      distanceM: points.length ? points[points.length - 1].sM : 0,
      points,
    };
  }

  private buildStrategy(strategy: StrategyConfig): ExportLapStrategy {
    const pwmTarget = strategy.pwmOn ?? 1;

    return {
      pwmOn: strategy.pwmOn,
      vInitKmh: strategy.vInit,
      defaultDtSlopeS: strategy.defaultDtSlope,
      defaultButtonColor: strategy.defaultColor,
      intervals: strategy.intervals.map((iv): ExportStrategyInterval => ({
        startDistanceM: iv.d,
        endDistanceM: iv.f,
        dtSlopeS: iv.dtSlope,
        pwmTarget,
        buttonColor: iv.color,
      })),
    };
  }

  private buildSimulation(
    startLapResult: SimResult | null | undefined,
    raceLapResult: SimResult | null | undefined,
    remainingRaceLaps: number,
    input: ExportPayloadBuilderInput
  ): ExportSimulation | undefined {
    if (!startLapResult && !raceLapResult) return undefined;

    const simulation: ExportSimulation = {};
    if (input.solver) simulation.solver = input.solver;
    if (Number.isFinite(input.dtS)) simulation.dtS = input.dtS;
    if (startLapResult) simulation.startLapResult = this.buildLapResult(startLapResult);
    if (raceLapResult) simulation.raceLapResult = this.buildLapResult(raceLapResult);

    const sessionResult = this.buildSessionResult(startLapResult, raceLapResult, remainingRaceLaps);
    if (sessionResult) simulation.sessionResult = sessionResult;

    return simulation;
  }

  private buildLapResult(result: SimResult): ExportLapSimulationResult {
    return {
      totalTimeS: result.totalTime,
      totalDistanceM: result.totalDistance,
      totalEnergyJ: result.totalEnergyJ,
      averageSpeedMps: result.vAvg,
      initialSpeedMps: this.firstFiniteSpeed(result.points),
      finalSpeedMps: this.lastFiniteSpeed(result.points),
    };
  }

  private buildSessionResult(
    startLapResult: SimResult | null | undefined,
    raceLapResult: SimResult | null | undefined,
    remainingRaceLaps: number
  ): ExportSessionSimulationResult | undefined {
    if (!startLapResult || !raceLapResult) return undefined;

    const totalTimeS = startLapResult.totalTime + remainingRaceLaps * raceLapResult.totalTime;
    const totalDistanceM = startLapResult.totalDistance + remainingRaceLaps * raceLapResult.totalDistance;
    const totalEnergyJ = startLapResult.totalEnergyJ + remainingRaceLaps * raceLapResult.totalEnergyJ;

    return {
      totalTimeS,
      totalDistanceM,
      totalEnergyJ,
      averageSpeedMps: totalTimeS > 0 ? totalDistanceM / totalTimeS : 0,
    };
  }

  private buildGhost(
    startLapResult: SimResult | null | undefined,
    raceLapResult: SimResult | null | undefined,
    stepS: number,
    circuit: CircuitProfile
  ): ExportGhost | undefined {
    if (!startLapResult && !raceLapResult) return undefined;

    return {
      sampling: {
        mode: 'time',
        stepS,
        source: 'downsampled_simulation',
      },
      startLap: startLapResult ? this.buildGhostPoints(startLapResult.points, stepS, circuit) : [],
      raceLap: raceLapResult ? this.buildGhostPoints(raceLapResult.points, stepS, circuit) : [],
    };
  }

  private buildGhostPoints(points: SimPoint[], stepS: number, circuit: CircuitProfile): ExportGhostPoint[] {
    const safeStepS = Number.isFinite(stepS) && stepS > 0 ? stepS : this.DEFAULT_GHOST_STEP_S;
    const out: ExportGhostPoint[] = [];
    let nextTimeS = 0;

    for (const point of points) {
      if (!Number.isFinite(point.t)) continue;

      if (!out.length || point.t >= nextTimeS || point === points[points.length - 1]) {
        out.push({
          timeS: point.t,
          distanceM: point.s,
          speedMps: point.v,
          pwm: point.pwm,
          currentA: point.i,
          energyJ: point.eElec,
          ...this.interpolateCircuitCoordinates(circuit, point.s),
        });
        nextTimeS = point.t + safeStepS;
      }
    }

    return out;
  }

  private interpolateCircuitCoordinates(circuit: CircuitProfile, distanceM: number): Partial<ExportGhostPoint> {
    const s = circuit.s ?? [];
    if (!Number.isFinite(distanceM) || s.length < 1) return {};

    const index = this.findCircuitSegmentIndex(s, distanceM);
    if (index === null) return {};

    const { i0, i1, ratio } = index;
    const coords: Partial<ExportGhostPoint> = {};

    const lat = this.interpolateOptionalSeries(circuit.lat, i0, i1, ratio);
    const lon = this.interpolateOptionalSeries(circuit.lon, i0, i1, ratio);
    if (lat !== undefined && lon !== undefined) {
      coords.lat = lat;
      coords.lon = lon;
    }

    const utmX = this.interpolateOptionalSeries(circuit.utmX, i0, i1, ratio);
    const utmY = this.interpolateOptionalSeries(circuit.utmY, i0, i1, ratio);
    if (utmX !== undefined && utmY !== undefined) {
      coords.utmX = utmX;
      coords.utmY = utmY;
    }

    return coords;
  }

  private findCircuitSegmentIndex(
    s: number[],
    distanceM: number
  ): { i0: number; i1: number; ratio: number } | null {
    const validIndexes = s
      .map((value, index) => ({ value, index }))
      .filter(item => Number.isFinite(item.value))
      .sort((a, b) => a.value - b.value);

    if (!validIndexes.length) return null;
    if (validIndexes.length === 1 || distanceM <= validIndexes[0].value) {
      const i = validIndexes[0].index;
      return { i0: i, i1: i, ratio: 0 };
    }

    const last = validIndexes[validIndexes.length - 1];
    if (distanceM >= last.value) {
      return { i0: last.index, i1: last.index, ratio: 0 };
    }

    for (let i = 1; i < validIndexes.length; i++) {
      const prev = validIndexes[i - 1];
      const next = validIndexes[i];

      if (distanceM <= next.value) {
        const ds = next.value - prev.value;
        const ratio = Math.abs(ds) > 1e-9 ? (distanceM - prev.value) / ds : 0;
        return { i0: prev.index, i1: next.index, ratio: Math.max(0, Math.min(1, ratio)) };
      }
    }

    return null;
  }

  private interpolateOptionalSeries(
    values: number[] | undefined,
    i0: number,
    i1: number,
    ratio: number
  ): number | undefined {
    if (!values?.length) return undefined;

    const v0 = values[i0];
    const v1 = values[i1];

    if (!Number.isFinite(v0)) return undefined;
    if (i0 === i1) return v0;
    if (!Number.isFinite(v1)) return undefined;

    return v0 + (v1 - v0) * ratio;
  }

  private firstFiniteSpeed(points: SimPoint[]): number | undefined {
    const first = points.find(p => Number.isFinite(p.v));
    return first?.v;
  }

  private lastFiniteSpeed(points: SimPoint[]): number | undefined {
    for (let i = points.length - 1; i >= 0; i--) {
      if (Number.isFinite(points[i].v)) return points[i].v;
    }
    return undefined;
  }
}
