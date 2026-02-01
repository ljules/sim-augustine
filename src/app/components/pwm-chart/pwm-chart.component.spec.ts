import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PwmChartComponent } from './pwm-chart.component';

describe('PwmChartComponent', () => {
  let component: PwmChartComponent;
  let fixture: ComponentFixture<PwmChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PwmChartComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PwmChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
