import type {
  IntervalColor,
  MotorConfig,
  VehicleConfig,
} from '../types';

export type ExportSchemaVersion = '1.0.0';

export type ExportAppName = 'Sim-Augustine';

export type ExportUnits = {
  distance: 'm';
  time: 's';
  speed: 'm/s';
  energy: 'J';
  current: 'A';
  pwm: 'ratio_0_1';
  altitude: 'm';
  voltage: 'V';
  angle: 'rad';
};

export type ExportCircuitPoint = {
  sM: number;
  zM: number;
  lat?: number;
  lon?: number;
  utmX?: number;
  utmY?: number;
};

export type ExportCircuit = {
  name: string;
  distanceM: number;
  points: ExportCircuitPoint[];
  source?: {
    type?: 'shell_csv' | 'manual' | 'imported_json' | string;
    fileName?: string;
  };
};

export type ExportVehicle = {
  vehicleConfig: VehicleConfig;
  motorConfig: MotorConfig;
};

export type ExportButtonColor = IntervalColor | string;

export type ExportStrategyInterval = {
  startDistanceM: number;
  endDistanceM: number;
  dtSlopeS: number;
  pwmTarget: number;
  buttonColor: ExportButtonColor;
};

export type ExportLapStrategy = {
  pwmOn?: number;
  vInitKmh?: number;
  defaultDtSlopeS?: number;
  defaultButtonColor?: ExportButtonColor;
  intervals: ExportStrategyInterval[];
};

export type ExportSession = {
  totalLaps: number;
  remainingRaceLaps: number;
  startLapStrategy: ExportLapStrategy;
  raceLapStrategy: ExportLapStrategy;
};

export type ExportLapSimulationResult = {
  totalTimeS: number;
  totalDistanceM: number;
  totalEnergyJ: number;
  averageSpeedMps: number;
  initialSpeedMps?: number;
  finalSpeedMps?: number;
};

export type ExportSessionSimulationResult = {
  totalTimeS: number;
  totalDistanceM: number;
  totalEnergyJ: number;
  averageSpeedMps: number;
};

export type ExportSimulation = {
  solver?: 'Euler' | 'RK4' | string;
  dtS?: number;
  startLapResult?: ExportLapSimulationResult;
  raceLapResult?: ExportLapSimulationResult;
  sessionResult?: ExportSessionSimulationResult;
};

export type ExportGhostSampling = {
  mode: 'time' | 'distance';
  stepS?: number;
  stepDistanceM?: number;
  source: 'downsampled_simulation' | 'raw_simulation' | string;
};

export type ExportGhostPoint = {
  timeS: number;
  distanceM: number;
  speedMps: number;
  pwm?: number;
  currentA?: number;
  energyJ?: number;
  lat?: number;
  lon?: number;
  utmX?: number;
  utmY?: number;
};

export type ExportGhost = {
  sampling: ExportGhostSampling;
  startLap: ExportGhostPoint[];
  raceLap: ExportGhostPoint[];
};

export type ExportMetadata = {
  exportedBy: ExportAppName | string;
  notes?: string;
  compatibility?: {
    androGustineMinSchema?: ExportSchemaVersion | string;
    simAugustineMinSchema?: ExportSchemaVersion | string;
  };
  [key: string]: unknown;
};

export type SimAugustineExportJson = {
  schemaVersion: ExportSchemaVersion;
  appName: ExportAppName;
  createdAt: string;
  units: ExportUnits;
  circuit: ExportCircuit;
  vehicle: ExportVehicle;
  session: ExportSession;
  simulation?: ExportSimulation;
  ghost?: ExportGhost;
  metadata: ExportMetadata;
};
