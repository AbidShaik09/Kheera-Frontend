import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { LabeledInput } from './labeled-input';

describe('LabeledInput', () => {
  let fixture: ComponentFixture<LabeledInputHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LabeledInputHost],
    }).compileComponents();

    fixture = TestBed.createComponent(LabeledInputHost);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});

@Component({
  imports: [ReactiveFormsModule, LabeledInput],
  template: `
    <form [formGroup]="form">
      <app-labeled-input label="Email" placeholder="Email" controlName="email" />
    </form>
  `,
})
class LabeledInputHost {
  readonly form = new FormGroup({
    email: new FormControl(''),
  });
}
