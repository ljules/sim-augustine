import { TestBed } from '@angular/core/testing';

import { CircuitStoreService } from './circuit-store.service';

describe('CircuitStoreService', () => {
  let service: CircuitStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CircuitStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
