import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AltitudeChartComponent } from './altitude-chart.component';

describe('AltitudeChartComponent', () => {
  let component: AltitudeChartComponent;
  let fixture: ComponentFixture<AltitudeChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AltitudeChartComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AltitudeChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
