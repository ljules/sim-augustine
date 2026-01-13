import { TestBed } from '@angular/core/testing';

import { CircuitCsvParserService } from './circuit-csv-parser.service';

describe('CircuitCsvParserService', () => {
  let service: CircuitCsvParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CircuitCsvParserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
