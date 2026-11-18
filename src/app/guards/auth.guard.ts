import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Rutas privadas: se espera a que InsForge valide la sesión (por ejemplo, al
 * volver de Google). Si no hay usuario, se vuelve al login y se recuerda la
 * ruta que se quería abrir.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ready;

  if (auth.currentUser()) {
    return true;
  }

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Login y registro: si ya hay una sesión activa, se entra directo al dashboard. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ready;

  return auth.currentUser() ? router.createUrlTree(['/dashboard']) : true;
};
