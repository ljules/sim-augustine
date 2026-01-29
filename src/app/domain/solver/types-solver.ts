
// Définition des types traitées et calculée par la fonction d'état du système :
export type SyStateVar = {
    // Valeurs différentielles, calculées par la fonction d'état du système :
    ds: number;      // ds/dt (m/s)
    dv: number;      // dv/dt (m/s²)

    // Valeurs non différentielles (modèle sans inductance, i est calculée directement au lieu de di) :
    i: number;       // courant mouteur (A), calculé par la fonction d'état du système 
    
    // Valeurs d'environnement du système/véhicule :
    alpha: number;   // pente (rad)
    pwm: number;     // rapport cycle PWM (0..1)
    u_mot: number;   // tension moteur (V), calculée par le produit pwm * u_batt    
};


// Définition de la fonction d'état du système qui retourne les variables d'état du système :
export type SyStateFn = (s: number, v: number) => SyStateVar;


// Définition du type de retour pour les fonctions du calcul par pas (eulerStep() ou rk4Step) :
export type StepResult = {
    sNext: number;              // Position pour la calcul la position suivante
    vNext: number;              // Vitesse pour le calcul de l'étape suivante
    iStep: number;              // Courant calculé en début d'étape, i n'est pas connu au lancement de la simulation
    context: SyStateVar;        // Valeurs du contexte de calcul
};