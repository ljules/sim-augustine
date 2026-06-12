import { Routes } from '@angular/router';
import { CircuitPageComponent } from './pages/circuit-page/circuit-page.component';
import { VehiclePageComponent } from './pages/vehicle-page/vehicle-page.component';
import { StrategyPageComponent } from './pages/strategy-page/strategy-page.component';
import { SimulationStartPageComponent } from './pages/simulation-start-page/simulation-start-page.component';
import { SimulationRaceLapsPageComponent } from './pages/simulation-race-laps-page/simulation-race-laps-page.component';


export const routes: Routes = [
    { path: '', pathMatch: 'full', redirectTo: 'simulation' },
    { path: 'circuit', component: CircuitPageComponent },
    { path: 'vehicule', component: VehiclePageComponent },
    { path: 'strategie', component: StrategyPageComponent },
    { path: 'simulation', pathMatch: 'full', redirectTo: 'simulation/depart' },
    { path: 'simulation/depart', component: SimulationStartPageComponent },
    { path: 'simulation/n-tours', component: SimulationRaceLapsPageComponent },
    { path: '**', redirectTo: 'simulation' },
    ];
