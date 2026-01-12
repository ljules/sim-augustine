import { TestBed } from '@angular/core/testing';

import { SimulationStoreService } from './simulation-store.service';

describe('SimulationStoreService', () => {
  let service: SimulationStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SimulationStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
