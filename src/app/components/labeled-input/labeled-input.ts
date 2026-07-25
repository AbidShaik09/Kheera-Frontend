import { Component, input, InputSignal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-labeled-input',
  imports: [ReactiveFormsModule],
  templateUrl: './labeled-input.html',
  styleUrl: './labeled-input.css',
})
export class LabeledInput {
  label: InputSignal<string> = input('');
  placeholder: InputSignal<string> = input('');
  formControlName: InputSignal<string | number | null> = input<string | number | null>(null);
}
