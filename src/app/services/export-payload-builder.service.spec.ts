import { TestBed } from '@angular/core/testing';

import { ExportPayloadBuilderService } from './export-payload-builder.service';

describe('ExportPayloadBuilderService', () => {
  let service: ExportPayloadBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExportPayloadBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
