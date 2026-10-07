import { Component, signal } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-login',
  styleUrl: './login.scss',
  templateUrl: './login.html',
})
export class Login {
  /** Mensaje de validación que se muestra sobre el botón. */
  readonly error = signal<string | null>(null);

  onSubmit(event: Event): void {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    if (!email || !password) {
      this.error.set('Ingresa tu correo y tu contraseña para continuar.');
      return;
    }

    this.error.set(null);
    // TODO: conectar con el servicio de autenticación cuando exista.
  }
}
