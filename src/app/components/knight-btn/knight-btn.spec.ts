import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KnightBtn } from './knight-btn';

describe('KnightBtn', () => {
  let component: KnightBtn;
  let fixture: ComponentFixture<KnightBtn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KnightBtn],
    }).compileComponents();

    fixture = TestBed.createComponent(KnightBtn);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
