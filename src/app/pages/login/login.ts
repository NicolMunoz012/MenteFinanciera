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
  readonly isLoading = signal(false);
  readonly oauthError = signal<string | null>(null);

  onForgotPassword(event: Event): void {
    event.preventDefault();
    this.notice.set(
      'Esta es una demo: no se envían correos de recuperación. Crea una cuenta nueva si olvidaste tu contraseña.',
    );
  }

  /** Redirige a la pantalla de Google; al volver, el SDK crea la sesión. */
  async onGoogle(): Promise<void> {
    this.oauthError.set(null);
    this.isLoading.set(true);
    const started = await this.auth.loginWithGoogle();
    this.isLoading.set(false);

    if (!started) {
      this.oauthError.set('No se pudo abrir el inicio de sesión con Google. Inténtalo de nuevo.');
    }
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.notice.set(null);

    const form = event.target as HTMLFormElement;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    if (!email || !password) {
      this.error.set('Ingresa tu correo y tu contraseña para continuar.');
      return;
    }

    this.isLoading.set(true);
    const loggedIn = await this.auth.login(email, password);
    this.isLoading.set(false);

    if (!loggedIn) {
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
