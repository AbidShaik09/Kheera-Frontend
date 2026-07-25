import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navbar-logo',
  imports: [],
  templateUrl: './navbar-logo.html',
  styleUrl: './navbar-logo.css',
})
export class NavbarLogo {
  private router = inject(Router);
  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}
