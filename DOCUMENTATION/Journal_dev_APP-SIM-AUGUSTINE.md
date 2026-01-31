# JOURNAL DE DEVELOPPEMENT DE L'APPLICATION APP-SIM-AUGUSTINE

## Commandes de création :

### Génération du projet :

``` sh
ng new app-sim-augustine --standalone --routing --style=css
cd app-sim-augustine
```

### Installation et configuration de Bootstrap :

Ajout de **Bootstrap** :
``` sh
npm i bootstrap
```

Ajout de **Bootstrap icons** :
``` sh
npm i bootstrap-icons
```

Afin d'avoir une bonne intégration de **Bootstrap** nous utiliserons **ng-bootsrap**. 
Procédons à son ajout :

``` sh
ng add @ng-bootstrap/ng-bootstrap
```

Il faut maintenant procéder à la déclaration du **Bootstrap** et **Bootstrap icons** dans le fichier de configuration d'**Angular**.

Cible : `angular.json`

Aller dans (vers la ligne 27) `projects > ... > architect > build > options > styles`

``` json
"styles": [
    "node_modules/bootstrap/dist/css/bootstrap.min.css",
    "node_modules/bootstrap-icons/font/bootstrap-icons.css",
    "src/styles.css"
],
"scripts": [
    "node_modules/bootstrap/dist/js/bootstrap.bundle.min.js"
            ]
```


### Génération de la structure du projet :

#### Génération des pages routées :

``` sh
ng g component pages/circuit-page --standalone
ng g component pages/vehicle-page --standalone
ng g component pages/strategy-page --standalone
ng g component pages/simulation-page --standalone

```

#### Composants partagés (Interface Utilisateur) :

``` sh
ng g component shared/components/navbar --standalone
ng g component shared/components/footer --standalone
ng g component shared/components/altitude-chart --standalone
ng g component shared/components/grade-chart --standalone
ng g component shared/components/strategy-timeline --standalone
ng g component shared/components/speed-chart --standalone
ng g component shared/components/current-chart --standalone
ng g component shared/components/energy-chart --standalone
ng g component shared/components/CircuitMapComponent --standalone
ng g component shared/components/dual-speed-altitude-chart --standalone
ng g component shared/components/pwm-chart --standalone
```

#### Génération des services (état + persistance avec *local storage*) :

``` sh
ng g service core/services/circuit-store
ng g service core/services/vehicle-store
ng g service core/services/strategy-store
ng g service core/services/export
ng g service core/services/circuit-csv-parser

```


- `*-store` : garde l’état courant + localStorage (circuit/vehicule/strategie/résultats).
- `export` : export CSV des résultats.


#### Création des classes métier (domaine):

Nous allons maintenant créer les fichiers **TypeScript** correspondant au modèle(domaine métier)

Commençons par les dossiers afin de structure notre projet.

``` sh
mkdir src\app\domain\circuit
mkdir src\app\domain\vehicle
mkdir src\app\domain\solver
mkdir src\app\domain\strategy
mkdir src\app\domain\simulation
```

Enfin les fichiers `.ts`.

``` sh
touch src/app/domain/types.ts
touch src/app/domain/circuit/circuit.ts
touch src/app/domain/vehicle/motor.ts
touch src/app/domain/vehicle/vehicle.ts
touch src/app/domain/solver/euler.ts
touch src/app/domain/solver/rk4.ts
touch src/app/domain/strategy/interval-strategy.ts
touch src/app/domain/simulation/simulate-intervals.ts
```

ou avec **PowerShell** :
``` sh
ni src\app\domain\types.ts -ItemType File
ni src\app\domain\circuit\circuit.ts -ItemType File
ni src\app\domain\vehicle\motor.ts -ItemType File
ni src\app\domain\vehicle\vehicle.ts -ItemType File
ni src\app\domain\solver\euler.ts -ItemType File
ni src\app\domain\solver\rk4.ts -ItemType File
ni src\app\domain\strategy\interval-strategy.ts -ItemType File
ni src\app\domain\simulation\simulate-intervals.ts -ItemType File
```

## Autres bibliothèques :

### PapaParse (lecture des `.csv`) :

Pour lire les `.csv` nous allons nous appuye sur la bibliothèque `PapaParse`, la bibliothèque étant développée en pur **JavaScript** nous allons égaleement installé les types associés.

``` sh
npm i papaparse
npm i -D @types/papaparse
```

### Chart.js (affichage des graphiques) :

``` sh
npm i chart.js
```


### Publication GitHub Pages :

Installation de l'outil de publication :

``` sh
ng add angular-cli-ghpages
```

Commande de publication : `ng deploy --base-href="https://ljules.github.io/sim-augustine/"`