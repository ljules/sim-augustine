import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CircuitMapComponent } from './circuit-map-component.component';

describe('CircuitMapComponentComponent', () => {
  let component: CircuitMapComponent;
  let fixture: ComponentFixture<CircuitMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CircuitMapComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CircuitMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
