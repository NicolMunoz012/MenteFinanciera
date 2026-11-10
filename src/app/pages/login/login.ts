import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthBrandPanel } from '../../components/auth-brand-panel/auth-brand-panel';
import { ThemeToggle } from '../../components/theme-toggle/theme-toggle';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink, AuthBrandPanel, ThemeToggle],
  styleUrls: ['../auth.scss', './login.scss'],
  templateUrl: './login.html',
})
export class Login {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  /** Mensaje de validación que se muestra sobre el botón. */
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly showPassword = signal(false);

  onForgotPassword(event: Event): void {
    event.preventDefault();
    this.notice.set(
      'Esta es una demo local y no envía correos. Usa una de las cuentas de prueba que aparecen abajo.',
    );
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.notice.set(null);

    const form = event.target as HTMLFormElement;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const remember = (form.elements.namedItem('remember') as HTMLInputElement).checked;

    if (!email || !password) {
      this.error.set('Ingresa tu correo y tu contraseña para continuar.');
      return;
    }

    if (!this.auth.login(email, password, remember)) {
      this.error.set('Correo o contraseña incorrectos. Revisa tus datos e inténtalo de nuevo.');
      return;
    }

    this.error.set(null);

    // Ruta privada que se intentó abrir antes del login (la agrega el authGuard).
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const target = returnUrl?.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/dashboard';
    this.router.navigateByUrl(target);
  }
}
