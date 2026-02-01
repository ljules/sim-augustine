import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CircuitRibbon3dComponent } from './circuit-ribbon3d.component';

describe('CircuitRibbon3dComponent', () => {
  let component: CircuitRibbon3dComponent;
  let fixture: ComponentFixture<CircuitRibbon3dComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CircuitRibbon3dComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CircuitRibbon3dComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
