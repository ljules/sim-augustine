import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CircuitPageComponent } from './circuit-page.component';

describe('CircuitPageComponent', () => {
  let component: CircuitPageComponent;
  let fixture: ComponentFixture<CircuitPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CircuitPageComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CircuitPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
