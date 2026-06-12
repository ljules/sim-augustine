# Architecture technique Sim-Augustine

Date de rédaction : 2026-06-12  
Public cible : développeur reprenant le projet dans plusieurs mois

## Vue d'ensemble

Sim-Augustine est une application Angular standalone destinée à préparer, simuler et présenter la stratégie de pilotage du véhicule Augustine pour le Shell Eco-Marathon.

L'application couvre aujourd'hui :

- l'import d'un circuit depuis un CSV Shell Eco-Marathon ;
- la configuration du véhicule et du moteur ;
- la définition d'une session de course ;
- la simulation du tour de départ ;
- la simulation d'un tour type pour les tours suivants ;
- la présentation de la stratégie complète au pilote ;
- l'export JSON vers AndroGustine ;
- le réimport JSON côté Sim-Augustine pour restaurer la configuration.

La session de course est modélisée ainsi :

- 1 tour de départ ;
- `n` tours de course suivants, tous basés sur le même tour type ;
- exemple Pologne 2025 : `totalLaps = 11`, donc 1 tour de départ + 10 tours suivants.

Les résultats de simulation sont volontairement volatils : ils restent en mémoire applicative et ne sont pas persistés dans `localStorage`. Après un rafraîchissement navigateur, l'utilisateur doit relancer les simulations.

## Stack technique

Le projet est une application Angular 17 standalone.

Principales dépendances :

- Angular `17.3` ;
- Bootstrap `5.3` ;
- Bootstrap Icons ;
- Chart.js pour les graphiques ;
- Leaflet pour la carte OpenStreetMap ;
- Three.js pour la vue 3D du circuit ;
- PapaParse pour l'import CSV Shell ;
- Karma/Jasmine pour les tests unitaires Angular.

Commandes principales :

```sh
npm start
npm run build
npm test
```

Le build de production sort dans :

```text
dist/app-sim-augustine
```

Note observée en environnement sandbox : `npm run build` peut échouer sur un `EPERM` lors de la réécriture de `dist/3rdpartylicenses.txt`. Une relance hors sandbox passe.

## Organisation du code

Arborescence applicative principale :

```text
src/app
  app.config.ts
  app.routes.ts
  components/
  domain/
  pages/
  services/
```

### `components/`

Composants UI réutilisables :

- `navbar`, `footer` ;
- graphiques Chart.js :
  - `altitude-chart`
  - `grade-chart`
  - `speed-chart`
  - `dual-speed-altitude-chart`
  - `current-chart`
  - `energy-chart`
  - `pwm-chart`
- visualisations de circuit :
  - `circuit-map-component` : SVG 2D avec bandes de stratégie et curseur ;
  - `circuit-osm-map` : Leaflet ;
  - `circuit-ribbon3d` : Three.js ;
- `strategy-timeline` : éditeur visuel des intervalles de stratégie.

### `domain/`

Le dossier `domain` contient le modèle métier et les calculs indépendants de l'interface.

Sous-dossiers :

- `circuit/` : interpolation altitude/pente ;
- `vehicle/` : modèle moteur et véhicule ;
- `strategy/` : stratégie PWM par intervalles ;
- `solver/` : Euler et RK4 ;
- `simulation/` : orchestration de simulation ;
- `session/` : helpers de session de course ;
- `export/` : contrat TypeScript du JSON d'export.

### `pages/`

Pages routées :

- `circuit-page` ;
- `vehicle-page` ;
- `simulation-start-page` ;
- `simulation-race-laps-page` ;
- `strategy-page` ;
- `simulation-page` : ancienne page de simulation, conservée temporairement mais plus routée directement.

### `services/`

Services applicatifs :

- `circuit-csv-parser.service.ts`
- `circuit-store.service.ts`
- `vehicle-store.service.ts`
- `strategy-store.service.ts`
- `race-session-store.service.ts`
- `export-payload-builder.service.ts`
- `sim-augustine-json-import.service.ts`
- `export.service.ts` : actuellement vide, probablement à remplacer ou compléter plus tard.

## Routage

Le routage est défini dans `src/app/app.routes.ts`.

Routes principales :

```text
/                     -> redirect /simulation
/circuit              -> CircuitPageComponent
/vehicule             -> VehiclePageComponent
/strategie            -> StrategyPageComponent
/simulation           -> redirect /simulation/depart
/simulation/depart    -> SimulationStartPageComponent
/simulation/n-tours   -> SimulationRaceLapsPageComponent
**                    -> redirect /simulation
```

La navigation est assurée par `NavbarComponent`. L'entrée "Simulation" est un menu déroulant vers :

- Simulation départ ;
- Simulation n tours.

## Modèle de données métier

Les types centraux sont dans `src/app/domain/types.ts`.

### Circuit

`CircuitProfile` :

- `name`
- `s` : distances cumulées en mètres ;
- `z` : altitude en mètres ;
- `utmX`, `utmY` ;
- `lon`, `lat`.

Le modèle suppose que `s` est croissant. Plusieurs composants et services en dépendent.

### Véhicule et moteur

`MotorConfig` décrit le moteur électrique :

- constantes moteur ;
- résistance ;
- inertie ;
- frottements ;
- tension max.

`VehicleConfig` décrit le véhicule :

- masse ;
- gravité ;
- frottements ;
- aérodynamique ;
- transmission ;
- roue.

`VehicleFullConfig` agrège :

- `motor`
- `vehicle`

### Stratégie mono-tour

`StrategyConfig` reste le modèle d'une stratégie pour un seul tour.

Champs principaux :

- `pwmOn`
- `vInit` en km/h ;
- `defaultDtSlope`
- `defaultColor`
- `intervals`

`Interval` :

- `d` : distance début en mètres ;
- `f` : distance fin en mètres ;
- `dtSlope` : durée de rampe PWM en secondes ;
- `color` : couleur de bouton physique (`yellow`, `green`, `blue`).

Important : la couleur ne doit jamais être la seule source de logique. La logique repose sur les distances et les rampes ; la couleur sert à l'affichage et aux boutons physiques.

### Session de course

`RaceSessionConfig` :

- `totalLaps`
- `startLapStrategy`
- `raceLapStrategy`

`RaceSessionResult` :

- `startLapResult`
- `raceLapResult`
- `remainingRaceLaps`
- `totalTime`
- `totalDistance`
- `totalEnergyJ`

En pratique, `RaceSessionResult` n'est pas encore stocké comme objet complet dans un service. Les résultats sont gardés séparément :

- résultat du tour de départ ;
- résultat du tour type suivant.

Les agrégats sont recalculés par les pages et services qui en ont besoin.

## Persistance et état applicatif

Le projet utilise `localStorage` pour les configurations, pas pour les résultats de simulation.

### `CircuitStoreService`

Clé localStorage :

```text
circuitProfile
```

Stocke et restaure le `CircuitProfile`.

### `VehicleStoreService`

Clé localStorage :

```text
vehicleFullConfig
```

Stocke `VehicleFullConfig`.

Le service fusionne avec les valeurs par défaut pour limiter les problèmes de clés manquantes.

### `StrategyStoreService`

Clés :

```text
strategyConfig
pilotBadge
```

Ce service est l'ancien store de stratégie mono-tour. Il reste utilisé pour :

- compatibilité historique ;
- choix d'avatar pilote ;
- certains points encore liés à l'ancienne page.

Il contient aussi `simResult` en mémoire, mais cette voie est héritée de l'ancien fonctionnement.

### `RaceSessionStoreService`

Clé :

```text
raceSessionConfig
```

Stocke uniquement `RaceSessionConfig`.

Contient en mémoire :

- `startLapResult`
- `raceLapResult`

Ces résultats ne sont pas persistés.

Méthodes importantes :

- `get()`
- `set(cfg)`
- `clear()`
- `clearResults()`
- `setStartLapResult(result)`
- `getStartLapResult()`
- `setRaceLapResult(result)`
- `getRaceLapResult()`

Migration douce :

- si `raceSessionConfig` n'existe pas, le service lit l'ancien `strategyConfig` ;
- cette ancienne stratégie devient `startLapStrategy` ;
- `raceLapStrategy` est initialisée par copie ;
- `totalLaps` vaut 11 par défaut.

## Simulation numérique

Les fonctions de simulation sont dans :

```text
src/app/domain/simulation/simulate-intervals.ts
```

Fonctions exposées :

- `simulateEulerIntervals(...)`
- `simulateRK4Intervals(...)`

Toutes deux appellent une fonction interne `simulateFixedDt(...)`.

Entrées principales :

- `Circuit`
- `Vehicle`
- `IntervalStrategy`
- `dt`
- `tMax`
- `vInitMps`

Sortie :

- `SimResult`

`SimResult` contient :

- `points`
- `totalTime`
- `totalDistance`
- `totalEnergyJ`
- `vAvg`

Chaque `SimPoint` contient :

- `t` en secondes ;
- `s` en mètres ;
- `v` en m/s ;
- `i` en ampères ;
- `pwm` en ratio 0..1 ;
- `alphaRad` ;
- `pElec` ;
- `eElec`.

### Modèle physique

`Vehicle.stepNoInductance(...)` applique un modèle sans inductance.

Le moteur calcule le courant via :

```text
i = (u_mot - fcem) / rm
```

avec clamp à `i >= 0`.

Le véhicule prend en compte :

- force de pente ;
- frottements secs ;
- frottements visqueux ;
- traînée aérodynamique ;
- propulsion ;
- pertes mécaniques moteur ;
- inertie équivalente moteur/roue.

### Gestion PWM

`IntervalStrategy` active le PWM selon la distance `s`.

Si le véhicule entre dans un intervalle `[d, f]`, la rampe démarre à l'instant d'entrée dans l'intervalle.

`dtSlope` pilote la montée de 0 à 1 :

- `dtSlope <= 0` : PWM directement à 1 ;
- sinon `pwm = elapsed / dtSlope`, clampé entre 0 et 1.

## Pages principales

### Page Circuit

Fichier :

```text
src/app/pages/circuit-page/
```

Responsabilités :

- importer un CSV Shell ;
- importer une session JSON Sim-Augustine ;
- afficher les statistiques circuit ;
- afficher carte OpenStreetMap ;
- afficher vue 3D ;
- afficher altitude et pente.

Import JSON :

- restaure circuit ;
- restaure véhicule ;
- restaure stratégies de session ;
- vide les résultats de simulation en mémoire ;
- ne restaure ni `simulation`, ni `ghost`.

### Page Véhicule

Responsabilités :

- éditer les paramètres véhicule ;
- éditer les paramètres moteur ;
- persister dans `VehicleStoreService`.

### Page Simulation départ

Fichier :

```text
src/app/pages/simulation-start-page/
```

Responsabilités :

- simuler le tour de départ ;
- utiliser `RaceSessionConfig.startLapStrategy` ;
- persister les changements de stratégie dans `RaceSessionStoreService` ;
- convertir `vInit` km/h en m/s pour le solveur ;
- stocker `startLapResult` en mémoire ;
- maintenir temporairement `StrategyStoreService.setSimResult(...)` pour compatibilité.

Le tour de départ est conçu pour démarrer à vitesse nulle par défaut.

### Page Simulation n tours

Fichier :

```text
src/app/pages/simulation-race-laps-page/
```

Responsabilités :

- simuler un seul tour type pour les tours suivants ;
- utiliser `RaceSessionConfig.raceLapStrategy` ;
- éditer `totalLaps` ;
- afficher `remainingRaceLaps = totalLaps - 1` ;
- comparer la vitesse finale du tour de départ avec `raceLapStrategy.vInit` ;
- permettre "Copier vitesse tour départ" ;
- stocker `raceLapResult` en mémoire.

La page affiche aussi des agrégats de session :

```text
temps total = startLapResult.totalTime + remainingRaceLaps * raceLapResult.totalTime
distance totale = startLapResult.totalDistance + remainingRaceLaps * raceLapResult.totalDistance
énergie totale = startLapResult.totalEnergyJ + remainingRaceLaps * raceLapResult.totalEnergyJ
vitesse moyenne = distance totale / temps total
```

### Page Stratégie

Fichier :

```text
src/app/pages/strategy-page/
```

Responsabilités :

- présenter la session complète ;
- afficher résumé de session ;
- gérer l'avatar pilote ;
- afficher l'animation simple du tour de départ ;
- afficher deux plans :
  - tour de départ ;
  - tours suivants ;
- afficher un tableau de consignes sur l'ensemble des tours ;
- prévisualiser l'export JSON ;
- télécharger l'export JSON.

Limite actuelle :

- l'animation est centrée sur le tour de départ uniquement ;
- il n'existe pas encore d'animation globale multi-tours.

## Consignes de pilotage

La page Stratégie produit un tableau unique pour toute la session.

Colonnes :

- numéro de tour ;
- début ;
- fin ;
- vitesse début ;
- vitesse fin ;
- couleur rampe.

Les temps sont absolus au niveau session :

- `00:00` correspond au début du tour 1 ;
- le tour 2 commence à la fin du tour 1 ;
- le tour `i` commence à :

```text
startLapResult.totalTime + (i - 2) * raceLapResult.totalTime
```

Les tours suivants réutilisent les consignes du tour type, avec un décalage temporel différent.

## Export JSON Sim-Augustine / AndroGustine

Les types du contrat sont dans :

```text
src/app/domain/export/export-json.ts
```

Le builder est :

```text
src/app/services/export-payload-builder.service.ts
```

Le payload racine est `SimAugustineExportJson`.

Sections principales :

- `schemaVersion`
- `appName`
- `createdAt`
- `units`
- `circuit`
- `vehicle`
- `session`
- `simulation?`
- `ghost?`
- `metadata`

`schemaVersion` actuel :

```text
1.0.0
```

### Unités

Les champs exportés portent l'unité dans leur nom :

- `distanceM`
- `timeS`
- `speedMps`
- `energyJ`
- `currentA`

Les vitesses de résultats sont en m/s.

Les stratégies conservent `vInitKmh` pour rester cohérentes avec l'interface utilisateur.

### Ghost

Le ghost est séparé :

- `ghost.startLap`
- `ghost.raceLap`

Les tours suivants ne sont pas dupliqués. `raceLap` représente un tour type répété `remainingRaceLaps` fois.

Le ghost est échantillonné par temps avec `stepS = 0.5` par défaut.

Chaque point ghost contient :

- `timeS`
- `distanceM`
- `speedMps`
- `pwm`
- `currentA`
- `energyJ`
- `lat/lon` si disponibles ;
- `utmX/utmY` si disponibles.

Les coordonnées ghost sont interpolées linéairement à partir des distances cumulées du circuit.

## Import JSON

Service :

```text
src/app/services/sim-augustine-json-import.service.ts
```

La première version d'import restaure uniquement la configuration.

Importé :

- circuit ;
- véhicule ;
- moteur ;
- `RaceSessionConfig`.

Non importé :

- `simulation.startLapResult`
- `simulation.raceLapResult`
- `ghost`

Après import :

- les résultats mémoire sont vidés via `RaceSessionStoreService.clearResults()` ;
- l'utilisateur doit relancer simulation départ puis simulation n tours.

Validations :

- `schemaVersion === "1.0.0"` ;
- `appName === "Sim-Augustine"` ;
- au moins deux points circuit ;
- `sM` et `zM` numériques ;
- distances `sM` strictement croissantes ;
- `totalLaps >= 2` ;
- stratégies présentes ;
- véhicule et moteur présents.

## Visualisations

### `CircuitMapComponent`

Composant SVG 2D.

Entrées importantes :

- `s`
- `utmX`
- `utmY`
- `intervals`
- `cursorDistance`
- `cursorAvatarUrl`

Il projette les coordonnées UTM en SVG et dessine :

- le tracé ;
- les bandes de stratégie ;
- la ligne départ/arrivée ;
- le curseur véhicule ;
- éventuellement un avatar pilote.

### Graphiques Chart.js

Les composants Chart.js détruisent/recréent ou mettent à jour leurs instances selon leurs entrées Angular.

Attention :

- plusieurs graphiques attendent des `SimPoint[]` ;
- les axes distance utilisent souvent `s` en mètres ;
- les vitesses affichées peuvent être converties en km/h côté UI.

### Leaflet et Three.js

`CircuitOsmMapComponent` exploite les coordonnées GPS.

`CircuitRibbon3DComponent` exploite le profil circuit pour une vue 3D.

## Flux principaux

### Préparation depuis CSV

1. L'utilisateur importe un CSV Shell sur la page Circuit.
2. `CircuitCsvParserService` produit un `CircuitProfile`.
3. `CircuitStoreService` persiste le circuit.
4. Les pages simulation utilisent ce circuit.

### Préparation depuis JSON

1. L'utilisateur importe un JSON sur la page Circuit.
2. `SimAugustineJsonImportService` valide le payload.
3. Le service restaure circuit, véhicule et session.
4. Les résultats mémoire sont vidés.
5. L'utilisateur relance les simulations.

### Simulation de session

1. `/simulation/depart` calcule `startLapResult`.
2. `/simulation/n-tours` calcule `raceLapResult`.
3. La page Stratégie calcule les agrégats et les consignes absolues.

### Export

1. La page Stratégie appelle `ExportPayloadBuilderService.buildFromCurrentState()`.
2. La prévisualisation affiche `JSON.stringify(payload, null, 2)`.
3. Le téléchargement crée un `Blob` `application/json`.
4. Le nom du fichier suit :

```text
sim-augustine-session-YYYYMMDD-HHMMSS.json
```

## Tests

Le projet contient surtout des tests de création Angular générés par défaut.

Services récents avec spec de création :

- `race-session-store.service.spec.ts`
- `export-payload-builder.service.spec.ts`
- `sim-augustine-json-import.service.spec.ts`

Tests à ajouter en priorité :

- migration `strategyConfig` vers `RaceSessionConfig` ;
- validation import JSON ;
- conversion export des stratégies ;
- interpolation ghost ;
- agrégats de session ;
- consignes absolues multi-tours.

## Points de vigilance

### Encodage

Le projet contient historiquement des textes accentués affichés avec des caractères corrompus dans certains fichiers. Des corrections ont déjà été faites manuellement à plusieurs endroits.

Recommandation :

- conserver les fichiers en UTF-8 ;
- vérifier visuellement les pages après modification de textes français ;
- éviter les remplacements massifs non nécessaires.

### Ancienne page Simulation

`SimulationPageComponent` existe encore mais n'est plus routé directement.

Ne pas le supprimer sans vérifier :

- imports restants ;
- tests ;
- compatibilité historique ;
- éventuels usages dans documentation ou branches.

### Résultats non persistés

Les résultats de simulation ne doivent pas être persistés dans `localStorage`.

Conséquence :

- après refresh, la page Stratégie ne peut plus afficher les résultats ;
- il faut relancer les simulations ;
- l'import JSON ne restaure pas les résultats.

### Unités

Attention aux conversions :

- UI stratégie : `vInit` en km/h ;
- solveur : vitesse initiale en m/s ;
- résultats `SimPoint.v` en m/s ;
- export résultats : m/s ;
- distances : mètres ;
- énergie : joules ;
- PWM : ratio 0..1.

### Taille export

Le ghost est échantillonné pour éviter un fichier trop volumineux.

Ne pas exporter tous les points bruts par défaut sans décision métier.

### AndroGustine

Le JSON est conçu pour Android, mais le contrat Kotlin n'est pas dans ce dépôt.

Avant stabilisation :

- documenter côté Android la version `1.0.0` ;
- ignorer les champs inconnus côté Kotlin ;
- échouer clairement si les champs obligatoires manquent.

## Travaux recommandés ensuite

Priorités techniques :

1. Ajouter des tests unitaires réels sur export/import.
2. Dédupliquer la logique commune entre `SimulationStartPageComponent` et `SimulationRaceLapsPageComponent`.
3. Formaliser un service de calcul d'agrégats de session.
4. Remplacer progressivement les restes de `StrategyStoreService` pour la stratégie par `RaceSessionStoreService`.
5. Améliorer l'animation Stratégie pour gérer toute la session et pas seulement le tour de départ.
6. Ajouter une documentation JSON dédiée pour AndroGustine.
7. Ajouter un validateur explicite du payload exporté.
8. Ajouter un réimport optionnel des résultats de simulation si le besoin métier est confirmé.

## Checklist de reprise rapide

Pour reprendre le projet :

1. Lancer `npm install` si nécessaire.
2. Lancer `npm start`.
3. Charger un circuit depuis `/circuit`.
4. Vérifier le véhicule depuis `/vehicule`.
5. Simuler le départ depuis `/simulation/depart`.
6. Simuler les tours suivants depuis `/simulation/n-tours`.
7. Vérifier la synthèse depuis `/strategie`.
8. Prévisualiser puis télécharger l'export JSON depuis `/strategie`.
9. Tester le réimport JSON depuis `/circuit`.

