import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-signin',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './signin.html',
  styleUrl: './signin.scss'
})
export class Signin {
  error = signal('');

  onSubmit(event: Event) {
    event.preventDefault();
    const form = new FormData(event.target as HTMLFormElement);
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const confirm = String(form.get('confirm') ?? '');
    const terms = form.get('terms') === 'on';

    if (!name || !email || !password || !confirm) {
      return this.error.set('Completa todos los campos.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return this.error.set('Ingresa un correo válido.');
    }
    if (password.length < 8) {
      return this.error.set('La contraseña debe tener mínimo 8 caracteres.');
    }
    if (password !== confirm) {
      return this.error.set('Las contraseñas no coinciden.');
    }
    if (!terms) {
      return this.error.set('Debes aceptar los términos y condiciones.');
    }

    this.error.set('');
    console.log('Registro válido', { name, email });
    // aquí llamas a tu servicio de registro
  }
}