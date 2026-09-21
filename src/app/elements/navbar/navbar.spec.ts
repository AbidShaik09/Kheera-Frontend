import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Navbar } from './navbar';
import { AuthService } from '../../services/auth-service';
import { Router, provideRouter } from '@angular/router';
import { Component } from '@angular/core';

@Component({ template: '' })
class LoginStub {}

describe('Navbar', () => {
  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [provideRouter([{ path: 'login', component: LoginStub }])],
    }).compileComponents();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('labels and disables unavailable product actions', async () => {
    TestBed.inject(AuthService).login('test-session');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('input[aria-label="Search (coming soon)"]')?.disabled,
    ).toBe(true);
    expect(
      fixture.nativeElement.querySelector('button[aria-label="Create (coming soon)"]')?.disabled,
    ).toBe(true);
    expect(fixture.nativeElement.textContent).not.toContain('9+');
  });

  it('signs out through the visible action and returns to login', async () => {
    const auth = TestBed.inject(AuthService);
    auth.login('test-session');
    fixture.detectChanges();
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector('button[aria-label="Sign out"]');
    expect(button).toBeTruthy();
    button.click();
    await fixture.whenStable();
    expect(auth.accessToken()).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  afterEach(() => localStorage.clear());
});
