import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AbstractControl } from '@angular/forms';

interface ErrorDetails {
  requiredLength?: number;
  min?: number;
  max?: number;
}

const ERROR_MESSAGES: Record<string, (details: ErrorDetails) => string> = {
  required: () => 'Este campo es obligatorio.',
  minlength: ({ requiredLength }) => `Debe tener al menos ${requiredLength} caracteres.`,
  maxlength: ({ requiredLength }) => `No puede superar los ${requiredLength} caracteres.`,
  min: ({ min }) => `El valor mínimo es ${min}.`,
  max: ({ max }) => `El valor máximo es ${max}.`,
  email: () => 'Escribe un correo válido.',
  pattern: () => 'El formato no es válido.',
};

@Component({
  selector: 'app-form-field',
  imports: [CommonModule],
  templateUrl: './form-field.html',
  styleUrl: './form-field.scss',
})
export class FormField {
  @Input({ required: true }) label = '';
  @Input({ required: true }) control!: AbstractControl;

  get errorMessage(): string | null {
    if (!this.control.touched || !this.control.errors) {
      return null;
    }
    const [errorKey, details] = Object.entries(this.control.errors)[0];
    return ERROR_MESSAGES[errorKey]?.(details) ?? 'El valor no es válido.';
  }
}
