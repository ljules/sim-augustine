import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimulationPageComponent } from './simulation-page.component';

describe('SimulationPageComponent', () => {
  let component: SimulationPageComponent;
  let fixture: ComponentFixture<SimulationPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimulationPageComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SimulationPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
