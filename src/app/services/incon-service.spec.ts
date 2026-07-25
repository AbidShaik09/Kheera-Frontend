import { TestBed } from '@angular/core/testing';

import { InconService } from './incon-service';

describe('InconService', () => {
  let service: InconService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InconService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
