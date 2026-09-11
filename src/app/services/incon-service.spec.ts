import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material/icon';

import { IconService } from './incon-service';

describe('IconService', () => {
  let service: IconService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        IconService,
        { provide: MatIconRegistry, useValue: { addSvgIcon: vi.fn() } },
        {
          provide: DomSanitizer,
          useValue: { bypassSecurityTrustResourceUrl: vi.fn() },
        },
      ],
    });
    service = TestBed.inject(IconService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
