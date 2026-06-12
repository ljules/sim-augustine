import { TestBed } from '@angular/core/testing';

import { RaceSessionStoreService } from './race-session-store.service';

describe('RaceSessionStoreService', () => {
  let service: RaceSessionStoreService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(RaceSessionStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should migrate legacy strategyConfig into a race session config', () => {
    localStorage.setItem('strategyConfig', JSON.stringify({
      pwmOn: 1,
      vInit: 3,
      defaultDtSlope: 2,
      defaultColor: 'green',
      intervals: [
        { d: 10, f: 20, dtSlope: 2, color: 'green' },
      ],
    }));

    const cfg = service.get();

    expect(cfg.totalLaps).toBe(11);
    expect(cfg.startLapStrategy.intervals.length).toBe(1);
    expect(cfg.raceLapStrategy.intervals.length).toBe(1);
    expect(cfg.startLapStrategy).not.toBe(cfg.raceLapStrategy);
    expect(localStorage.getItem('raceSessionConfig')).toBeTruthy();
  });
});
