export type CircuitProfile = {
  // points triés par distance croissante (m)
  s: number[];
  altitude: number[];
};

export type VehicleConfig = {
  massKg: number;
  crr: number;
  cdA: number;
  wheelRadiusM: number;
  airDensity: number; // kg/m3
  g: number; // 9.81
};

export type MotorConfig = {
  // MVP: modèle sans inductance (quasi-statique)
  R: number;          // ohms
  ke: number;         // V / (rad/s)
  kt: number;         // N.m / A
  gearRatio: number;  // rapport de réduction
  efficiency: number; // 0..1
  maxVoltage: number; // V
};

export type StrategyConfig = {
  vMin: number; // m/s
  vMax: number; // m/s
  pwmOn: number; // 0..1 (commande quand ON)
};

export type SimPoint = {
  t: number;
  s: number;
  v: number;
  i: number;
  pwm: number;
  alphaRad: number;
  pElec: number;
  eElec: number; // énergie cumulée (J)
};

export type SimResult = {
  points: SimPoint[];
  totalTime: number;
  totalDistance: number;
  totalEnergyJ: number;
  vAvg: number;
};
