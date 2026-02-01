import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DualSpeedAltitudeChartComponent } from './dual-speed-altitude-chart.component';

describe('DualSpeedAltitudeChartComponent', () => {
  let component: DualSpeedAltitudeChartComponent;
  let fixture: ComponentFixture<DualSpeedAltitudeChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DualSpeedAltitudeChartComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DualSpeedAltitudeChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
