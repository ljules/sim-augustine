import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimulationRaceLapsPageComponent } from './simulation-race-laps-page.component';

describe('SimulationRaceLapsPageComponent', () => {
  let component: SimulationRaceLapsPageComponent;
  let fixture: ComponentFixture<SimulationRaceLapsPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimulationRaceLapsPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SimulationRaceLapsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
