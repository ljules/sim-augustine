export type CircuitProfile = {
  name: string;
  s: number[];        // distance (m)
  z: number[];        // elevation (m)
  utmX: number[];
  utmY: number[];
  lon: number[];
  lat: number[];
};


export type MotorConfig = {
  kuRpmPerV: number;     // ku = 102 (tr/min)/V
  ke: number;           // V/(rad/s) (calculé depuis ku)
  kc: number;           // Nm/A
  rm: number;           // Ohm
  lm: number;           // H (pas utilisé en mode sans inductance)
  jm: number;           // kg.m²
  fvm: number;          // Nm.s/rad
  cs: number;           // Nm
  maxVoltage: number;   // V (pour convertir PWM -> u_mot)
};


export type VehicleConfig = {
  m: number;        // kg
  g: number;        // m/s²
  fs: number;       // coeff frottements secs (roulement)
  rho: number;      // kg/m³
  s: number;        // surface frontale m²
  cx: number;       // coeff traînée
  r_red: number;    // rapport réducteur
  r_roue: number;   // m
  fv: number;       // N.s/m
};


export type VehicleFullConfig = {
  motor: MotorConfig;
  vehicle: VehicleConfig;
};


export type Interval = { d: number; f: number };


export type StrategyConfig = {
  pwmOn: number;          // 0..1
  intervals: Interval[];  // distances en m
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
