import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard, guestGuard } from './auth.guard';

describe('Auth guards', () => {
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    auth = TestBed.inject(AuthService);
  });

  const runGuard = (guard: typeof authGuard, url: string) =>
    TestBed.runInInjectionContext(() => guard({} as never, { url } as never));

  it('bloquea las rutas privadas sin sesión y recuerda la ruta pedida', () => {
    const result = runGuard(authGuard, '/dashboard');

    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toContain('returnUrl=%2Fdashboard');
  });

  it('permite las rutas privadas cuando hay sesión', () => {
    auth.login('carlos@mentefinanciera.com', 'Carlos123*');

    expect(runGuard(authGuard, '/dashboard')).toBe(true);
  });

  it('no deja volver al login si ya hay sesión', () => {
    auth.login('carlos@mentefinanciera.com', 'Carlos123*');

    const result = runGuard(guestGuard, '/login');
    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe('/dashboard');
  });

  it('permite el login cuando no hay sesión', () => {
    expect(runGuard(guestGuard, '/login')).toBe(true);
  });
});
