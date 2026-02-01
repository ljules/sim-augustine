import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StrategyTimelineComponent } from './strategy-timeline.component';

describe('StrategyTimelineComponent', () => {
  let component: StrategyTimelineComponent;
  let fixture: ComponentFixture<StrategyTimelineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StrategyTimelineComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(StrategyTimelineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
