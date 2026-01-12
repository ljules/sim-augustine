import { Routes } from '@angular/router';
import { CircuitPageComponent } from './pages/circuit-page/circuit-page.component';
import { VehiclePageComponent } from './pages/vehicle-page/vehicle-page.component';
import { StrategyPageComponent } from './pages/strategy-page/strategy-page.component';
import { SimulationPageComponent } from './pages/simulation-page/simulation-page.component';


export const routes: Routes = [
    { path: '', pathMatch: 'full', redirectTo: 'simulation' },
    { path: 'circuit', component: CircuitPageComponent },
    { path: 'vehicule', component: VehiclePageComponent },
    { path: 'strategie', component: StrategyPageComponent },
    { path: 'simulation', component: SimulationPageComponent },
    { path: '**', redirectTo: 'simulation' },
    ];
