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

  it('should draw a strategy segment even when the interval is between two circuit points', () => {
    component.s = [0, 100];
    component.utmX = [0, 100];
    component.utmY = [0, 0];
    component.intervals = [{ d: 20, f: 30, dtSlope: 5, color: 'yellow' }];

    component.ngOnChanges({
      s: {} as any,
      utmX: {} as any,
      utmY: {} as any,
      intervals: {} as any,
    });

    expect(component.highlightPaths.length).toBe(1);
    expect(component.highlightPaths[0].d).toContain('M');
    expect(component.highlightPaths[0].d).toContain('L');
  });
});
