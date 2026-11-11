import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthBrandPanel } from '../../components/auth-brand-panel/auth-brand-panel';
import { ThemeToggle } from '../../components/theme-toggle/theme-toggle';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signin',
  imports: [RouterLink, AuthBrandPanel, ThemeToggle],
  templateUrl: './signin.html',
  styleUrls: ['../auth.scss', './signin.scss'],
})
export class Signin {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly error = signal('');
  readonly showPassword = signal(false);
  readonly showConfirm = signal(false);
  readonly showTerms = signal(false);

  onSubmit(event: Event): void {
    event.preventDefault();
    const form = new FormData(event.target as HTMLFormElement);
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const confirm = String(form.get('confirm') ?? '');
    const terms = form.get('terms') === 'on';

    if (!name || !email || !password || !confirm) {
      return this.error.set('Completa todos los campos para crear tu cuenta.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return this.error.set('Ingresa un correo electrónico válido.');
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

    if (!this.auth.register({ name, email, password })) {
      return this.error.set('Ya existe una cuenta con ese correo. Inicia sesión.');
    }

    this.error.set('');
    this.router.navigate(['/dashboard']);
  }
}
