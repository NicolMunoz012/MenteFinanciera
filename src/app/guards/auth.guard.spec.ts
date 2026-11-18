import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';
import { SessionUser } from '../models/user.model';
import { AuthService } from '../services/auth.service';
import { authGuard, guestGuard } from './auth.guard';

describe('Auth guards', () => {
  const currentUser = signal<SessionUser | null>(null);

  beforeEach(() => {
    currentUser.set(null);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser, ready: Promise.resolve() } },
      ],
    });
  });

  const runGuard = (guard: typeof authGuard, url: string) =>
    TestBed.runInInjectionContext(() => guard({} as never, { url } as never));

  const signIn = () =>
    currentUser.set({
      id: 'uuid-1',
      name: 'Carlos Ruiz',
      email: 'carlos@mentefinanciera.com',
      tier: 'FREE MEMBER',
    });

  it('bloquea las rutas privadas sin sesión y recuerda la ruta pedida', async () => {
    const result = await runGuard(authGuard, '/dashboard');

    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toContain('returnUrl=%2Fdashboard');
  });

  it('permite las rutas privadas cuando hay sesión', async () => {
    signIn();

    expect(await runGuard(authGuard, '/dashboard')).toBe(true);
  });

  it('no deja volver al login si ya hay sesión', async () => {
    signIn();

    const result = await runGuard(guestGuard, '/login');
    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe('/dashboard');
  });

  it('permite el login cuando no hay sesión', async () => {
    expect(await runGuard(guestGuard, '/login')).toBe(true);
  });
});
