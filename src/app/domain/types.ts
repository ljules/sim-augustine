// ==================================================================
//                 DECLARATION DES TYPES MANIPULES
// ==================================================================


// Type objet pour la modélisation du circuit à partir de données du CSV :
export type CircuitProfile = {
  name: string;
  s: number[];          // Distances/positions sur le circuit (m)
  z: number[];          // Elevations/altitudes sur chaque point du circuit (m)
  utmX: number[];       // Coordonnées X (m) du point dans le système UTM
  utmY: number[];       // Coordonnées Y (m) du point dans le système UTM
  lon: number[];        // Longitude (non exploité dans l'application)
  lat: number[];        // Latitude (non exploité dans l'application)
};


// Type objet pour la modélisation du moteur électrique :
export type MotorConfig = {
  kuRpmPerV: number;    // ku = 102 (tr/min)/V
  ke: number;           // V/(rad/s) (calculé depuis ku)
  kc: number;           // Nm/A
  rm: number;           // Ohm
  lm: number;           // H (pas utilisé en mode sans inductance)
  jm: number;           // kg.m²
  fvm: number;          // Nm.s/rad
  cs: number;           // Nm
  maxVoltage: number;   // V (pour convertir PWM -> u_mot)
};


// Type objet pour la modélisation du véhicule :
export type VehicleConfig = {
  m: number;            // kg
  g: number;            // m/s²
  fs: number;           // coeff frottements secs (roulement)
  rho: number;          // kg/m³
  s: number;            // surface frontale m²
  cx: number;           // coeff traînée
  z_pignon: number;      // nombre de dents du pigon moteur
  z_couronne: number;    // nombre de dents de la couronne 
  r_red: number;        // rapport réducteur
  r_roue: number;       // m
  fv: number;           // N.s/m
};


// Type objet modélisation du véhicule complet (moteur + coque véhicule) :
export type VehicleFullConfig = {
  motor: MotorConfig;
  vehicle: VehicleConfig;
};


// Couleurs pour les stratégies d'accélération :
export type IntervalColor = 'yellow' | 'red' | 'blue'


// Type objet de modélisation un intervalle de consigne PWM du moteur :
export type Interval = { 
    d: number;
    f: number;
    dtSlope: number;
    color: IntervalColor;
};


// Type objet de modélisation de l'ensemble des intervalles de consigne
// PWM du moteur pour une simulation complète :
export type StrategyConfig = {
  pwmOn?: number;                   // 0..1 pwmTime0to1
  defaultDtSlope?: number;          // Durée (s) pour passer PWM de 0 à 1
  defaultColor?: IntervalColor;     // Couleur par défaut pour l'intervalle
  intervals: Interval[];            // distances en m
};


// Type objet de modélisation d'un point de calcul de la simulation :
export type SimPoint = {
  t: number;                // Date (s)
  s: number;                // Position (m)
  v: number;                // Vitesse (m/s)
  i: number;                // Courant (A)
  pwm: number;              // Rapport cyclique (0.0 à 1.0)
  alphaRad: number;         // Angle de pente (rad)
  pElec: number;            // Puissance éléctrique (W)
  eElec: number;            // énergie cumulée (J)
};


// Type objet de modélisation du résultat complet de la simulation :
export type SimResult = {
  points: SimPoint[];       // Liste de points de simulation
  totalTime: number;        // Durée totale de la simulation (s)
  totalDistance: number;    // Distance total parcourue (m) durant la simulation
  totalEnergyJ: number;     // Energie totale consommée (J)
  vAvg: number;             // Vitesse moyenne
};
