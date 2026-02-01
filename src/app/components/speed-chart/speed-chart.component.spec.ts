import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpeedChartComponent } from './speed-chart.component';

describe('SpeedChartComponent', () => {
  let component: SpeedChartComponent;
  let fixture: ComponentFixture<SpeedChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpeedChartComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SpeedChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
