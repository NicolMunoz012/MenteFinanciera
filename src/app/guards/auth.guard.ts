import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Rutas privadas: si no hay sesión, se vuelve al login y se recuerda la ruta
 * que se quería abrir para regresar ahí después de iniciar sesión.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.currentUser()) {
    return true;
  }

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Login y registro: si ya hay una sesión activa, se entra directo al dashboard. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.currentUser() ? router.createUrlTree(['/dashboard']) : true;
};
