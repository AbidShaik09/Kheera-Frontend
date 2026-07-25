import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NavbarLogo } from './navbar-logo';

describe('NavbarLogo', () => {
  let component: NavbarLogo;
  let fixture: ComponentFixture<NavbarLogo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarLogo],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarLogo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
