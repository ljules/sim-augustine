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
export type IntervalColor = 'yellow' | 'green' | 'blue'


// Type objet de modélisation un intervalle de consigne PWM du moteur :
export type Interval = { 
    d: number;                  // Position de départ de l'intervalle (m)
    f: number;                  // Position de fin de l'intervalle (m)
    dtSlope: number;            // Durée (s) de l'accélaration pour passer de 0 à 100 % du PWM
    color: IntervalColor;       // Couleur du bouton associé à dtSlope (yellow, green ou blue)
};


// Type objet de modélisation de l'ensemble des intervalles de consigne
// PWM du moteur pour une simulation complète :
export type StrategyConfig = {
  pwmOn?: number;                   // 0..1 pwmTime0to1
  vInit?: number;                   // Vitesse initiale (km/h)
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


// Type objet représentant une session de course (Race Session) :
// Configuration persistable d'une session de course :
// - 1 tour de depart, decrit par startLapStrategy ;
// - n tours de course suivants, tous decrits par raceLapStrategy.
// Cette configuration ne contient aucun resultat de simulation.
export type RaceSessionConfig = {
  totalLaps: number;                    // Nombre total de tours d'une session de course
  startLapStrategy: StrategyConfig;     // Stratégie associée au 1er tour de la session de course
  raceLapStrategy: StrategyConfig;      // Stratégie associée au n tours de course
};

// Type objet réprésentant les résultats d'une session de course :
// Resultats calcules d'une session de course.
// Ces donnees sont volatiles : elles restent en memoire applicative et ne
// doivent pas etre persistees dans localStorage. Apres un refresh, la page
// Strategie doit continuer a demander de relancer une simulation.
export type RaceSessionResult = {
  startLapResult: SimResult;            // Résultats de la simulation pour le 1er tour
  raceLapResult: SimResult;             // Résultat commun pour les n tours suivants
  remainingRaceLaps: number;            // Nombre de tours de course apres le tour de depart : max(totalLaps - 1, 0)
  // Totaux de session : tour de depart + remainingRaceLaps fois le tour de course suivant.
  totalTime: number;                    // Durée totale
  totalDistance: number;                // Distance totale
  totalEnergyJ: number;                 // Energie totale consommée
};
