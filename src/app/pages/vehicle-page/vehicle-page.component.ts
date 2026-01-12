import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type VehicleConfig = {
  massKg: number;
  crr: number;
  cdA: number;
  wheelRadiusM: number;
};


@Component({
  selector: 'app-vehicle-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './vehicle-page.component.html',
  styleUrl: './vehicle-page.component.css'
})


export class VehiclePageComponent {
    cfg: VehicleConfig = {
        massKg: 120,
        crr: 0.003,
        cdA: 0.18,
        wheelRadiusM: 0.25,
    };

    save() {
        localStorage.setItem('vehicleConfig', JSON.stringify(this.cfg));
    }

    load(): void {
        const raw = localStorage.getItem('vehicleConfig');
        if (raw) {
        this.cfg = JSON.parse(raw);
        }
    }

}
