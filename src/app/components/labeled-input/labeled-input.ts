import { Component, input, InputSignal } from '@angular/core';
import { ControlContainer, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-labeled-input',
  imports: [ReactiveFormsModule],
  templateUrl: './labeled-input.html',
  styleUrl: './labeled-input.css',
  viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
})
export class LabeledInput {
  label: InputSignal<string> = input('');
  placeholder: InputSignal<string> = input('');
  controlName: InputSignal<string | number | null> = input<string | number | null>(null);
}
