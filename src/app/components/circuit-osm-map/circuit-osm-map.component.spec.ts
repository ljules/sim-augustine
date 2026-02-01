import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CircuitOsmMapComponent } from './circuit-osm-map.component';

describe('CircuitOsmMapComponent', () => {
  let component: CircuitOsmMapComponent;
  let fixture: ComponentFixture<CircuitOsmMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CircuitOsmMapComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CircuitOsmMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
