import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimulationStartPageComponent } from './simulation-start-page.component';

describe('SimulationStartPageComponent', () => {
  let component: SimulationStartPageComponent;
  let fixture: ComponentFixture<SimulationStartPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimulationStartPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SimulationStartPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
