import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GradeChartComponent } from './grade-chart.component';

describe('GradeChartComponent', () => {
  let component: GradeChartComponent;
  let fixture: ComponentFixture<GradeChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GradeChartComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GradeChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
