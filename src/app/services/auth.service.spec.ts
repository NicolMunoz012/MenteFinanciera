import { TestBed } from '@angular/core/testing';
import { InsforgeClient } from '../core/insforge';
import { AuthService, toSessionUser } from './auth.service';

const USER = {
  id: 'uuid-1',
  email: 'carlos@mentefinanciera.com',
  emailVerified: true,
  providers: ['password'],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  profile: { name: 'Carlos Ruiz' },
};

interface FakeAuth {
  signInWithPassword: () => Promise<{ data: unknown; error: unknown }>;
  signUp: () => Promise<{ data: unknown; error: unknown }>;
  signOut: () => Promise<{ error: unknown }>;
  getCurrentUser: () => Promise<{ data: unknown; error: unknown }>;
}

/** Cliente falso: los tests no dependen de internet. */
function createFakeAuth(): FakeAuth {
  return {
    signInWithPassword: async () => ({ data: null, error: null }),
    signUp: async () => ({ data: null, error: null }),
    signOut: async () => ({ error: null }),
    getCurrentUser: async () => ({ data: { user: null }, error: null }),
  };
}

describe('AuthService', () => {
  let auth: AuthService;
  let authApi: FakeAuth;

  beforeEach(() => {
    localStorage.clear();
    authApi = createFakeAuth();

    TestBed.configureTestingModule({
      providers: [{ provide: InsforgeClient, useValue: { client: { auth: authApi } } }],
    });
    auth = TestBed.inject(AuthService);
  });

  it('convierte el usuario de InsForge al modelo de la app', () => {
    expect(toSessionUser(USER)).toEqual({
      id: 'uuid-1',
      name: 'Carlos Ruiz',
      email: 'carlos@mentefinanciera.com',
      tier: 'FREE MEMBER',
    });
  });

  it('usa la parte del correo si el perfil no tiene nombre', () => {
    expect(toSessionUser({ ...USER, profile: null }).name).toBe('carlos');
  });

  it('inicia sesión con las credenciales correctas', async () => {
    authApi.signInWithPassword = async () => ({
      data: { user: USER, accessToken: 'token' },
      error: null,
    });

    await expect(auth.login('  carlos@mentefinanciera.com ', 'Carlos123*')).resolves.toBe(true);
    expect(auth.currentUser()?.name).toBe('Carlos Ruiz');
    expect(localStorage.getItem('mf.session')).toContain('Carlos Ruiz');
  });

  it('rechaza una contraseña incorrecta', async () => {
    authApi.signInWithPassword = async () => ({
      data: null,
      error: { statusCode: 401, message: 'Invalid credentials' },
    });

    await expect(auth.login('carlos@mentefinanciera.com', 'otra')).resolves.toBe(false);
    expect(auth.currentUser()).toBeNull();
  });

  it('registra una cuenta nueva e inicia sesión', async () => {
    authApi.signUp = async () => ({ data: { user: USER, accessToken: 'token' }, error: null });

    await expect(
      auth.register({ name: 'Carlos Ruiz', email: 'carlos@mentefinanciera.com', password: 'Carlos123*' }),
    ).resolves.toBe(true);
    expect(auth.currentUser()?.email).toBe('carlos@mentefinanciera.com');
  });

  it('no deja la sesión viva al cerrar sesión', async () => {
    authApi.signInWithPassword = async () => ({
      data: { user: USER, accessToken: 'token' },
      error: null,
    });
    await auth.login('carlos@mentefinanciera.com', 'Carlos123*');

    auth.logout();

    expect(auth.currentUser()).toBeNull();
    expect(localStorage.getItem('mf.session')).toBeNull();
  });
});
