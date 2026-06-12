import type { RaceSessionConfig, SimResult, StrategyConfig } from '../types';

// Nombre de tours total (tour de départ + n tours suivants) :
const DEFAULT_TOTAL_LAPS = 11;      

// Stratégie par défaut avec 2 accélérations :
const DEFAULT_STRATEGY: StrategyConfig = {
  pwmOn: 1.0,
  defaultDtSlope: 5.0,
  defaultColor: 'yellow',
  intervals: [
    { d: 50, f: 200, dtSlope: 5.0, color: 'yellow' },
    { d: 670, f: 880, dtSlope: 5.0, color: 'yellow' },
  ],
};

// Retourne le nombre de tour restant :
export function getRemainingRaceLaps(totalLaps: number): number {
  const safeTotalLaps = Number.isFinite(Number(totalLaps))
    ? Math.max(1, Math.floor(Number(totalLaps)))
    : DEFAULT_TOTAL_LAPS;

  return Math.max(0, safeTotalLaps - 1);
}

// Retourne la vitesse finale d'un tour en km/h :
export function getFinalSpeedKmh(simResult: SimResult | null | undefined): number | null {
  const points = simResult?.points ?? [];
  if (!points.length) return null;

  const v = Number(points[points.length - 1].v);
  if (!Number.isFinite(v)) return null;

  return v * 3.6;
}

// Construit une session de course par défaut à partir de DEFAULT_STRATEGY :
export function buildDefaultRaceSessionConfig(
  baseStrategy: StrategyConfig = DEFAULT_STRATEGY
): RaceSessionConfig {
  const startLapStrategy = cloneStrategyConfig(baseStrategy);

  return {
    totalLaps: DEFAULT_TOTAL_LAPS,
    startLapStrategy,
    raceLapStrategy: cloneStrategyConfig(startLapStrategy),
  };
}

// Copie une stratégie :
export function cloneStrategyConfig(strategy: StrategyConfig): StrategyConfig {
  return {
    ...strategy,
    intervals: (strategy.intervals ?? []).map(iv => ({ ...iv })),
  };
}
