import { TestBed } from '@angular/core/testing';

import { ConfigService } from './config-service';

describe('ConfigService', () => {
  let service: ConfigService;

  beforeEach(() => {
    window.__config = { apiUrl: 'http://localhost:8080' };
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
