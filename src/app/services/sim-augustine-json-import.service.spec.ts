import { TestBed } from '@angular/core/testing';

import { SimAugustineJsonImportService } from './sim-augustine-json-import.service';

describe('SimAugustineJsonImportService', () => {
  let service: SimAugustineJsonImportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SimAugustineJsonImportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
