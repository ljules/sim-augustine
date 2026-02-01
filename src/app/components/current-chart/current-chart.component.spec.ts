import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CurrentChartComponent } from './current-chart.component';

describe('CurrentChartComponent', () => {
  let component: CurrentChartComponent;
  let fixture: ComponentFixture<CurrentChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CurrentChartComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CurrentChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
