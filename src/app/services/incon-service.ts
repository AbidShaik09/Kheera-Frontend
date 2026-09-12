import { Injectable } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material/icon';

@Injectable({
  providedIn: 'root',
})
export class IconService {
  constructor(
    private iconRegistry: MatIconRegistry,
    private sanitizer: DomSanitizer,
  ) {
    this.registerIcons();
  }

  private registerIcons() {
    this.iconRegistry.addSvgIcon(
      'search',
      this.sanitizer.bypassSecurityTrustResourceUrl('icons/cil-search.svg'),
    );
    this.iconRegistry.addSvgIcon(
      'check',
      this.sanitizer.bypassSecurityTrustResourceUrl('icons/cil-check.svg'),
    );
  }
}
