import { inject, Injectable, signal } from '@angular/core';
import { InsforgeClient } from '../core/insforge';
import { NewUser, SessionUser } from '../models/user.model';
import { loadFromStorage, saveToStorage } from '../utils/storage';

const SESSION_KEY = 'mf.session';

/** Forma mínima del usuario que devuelve InsForge. */
interface InsforgeUser {
  id: string;
  email: string;
  profile: { name?: string } | null;
}

/**
 * Convierte el usuario de InsForge (UUID, email, perfil) al modelo de la app.
 * Si la cuenta no tiene nombre en el perfil, se usa la parte del correo.
 */
export function toSessionUser(user: InsforgeUser): SessionUser {
  return {
    id: user.id,
    name: user.profile?.name?.trim() || user.email.split('@')[0],
    email: user.email,
    tier: 'FREE MEMBER',
  };
}

/**
 * Autenticación con InsForge.
 *
 * El SDK guarda y refresca el token de sesión automáticamente. Aquí solo se
 * mantiene una copia de los datos básicos del usuario en una señal para que
 * las pantallas (y los guards) puedan leerla.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly insforge = inject(InsforgeClient);

  private readonly currentUserState = signal<SessionUser | null>(
    loadFromStorage<SessionUser | null>(SESSION_KEY, null),
  );

  readonly currentUser = this.currentUserState.asReadonly();

  /**
   * Promesa que termina cuando la sesión ya fue validada (incluye el regreso
   * de Google). Los guards la esperan antes de decidir si dejan pasar.
   */
  readonly ready: Promise<void>;

  constructor() {
    // Al recargar la página se valida la sesión que el SDK dejó guardada.
    this.ready = this.refreshSession();
  }

  /** Devuelve true si el correo y la contraseña son válidos. */
  async login(email: string, password: string): Promise<boolean> {
    const { data, error } = await this.insforge.client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data?.user) {
      return false;
    }

    this.setSession(toSessionUser(data.user));
    return true;
  }

  /** Crea la cuenta en InsForge e inicia sesión. False si algo falla. */
  async register(data: NewUser): Promise<boolean> {
    const email = data.email.trim();
    const { data: created, error } = await this.insforge.client.auth.signUp({
      email,
      password: data.password,
      name: data.name.trim(),
    });

    if (error) {
      return false;
    }

    if (created?.user) {
      this.setSession(toSessionUser(created.user));
      return true;
    }

    // Si el proyecto exige verificar el correo, aún no hay sesión.
    return this.login(email, data.password);
  }

  logout(): void {
    // Se limpia la copia local de inmediato para que la interfaz reaccione;
    // el cierre real de la sesión en el backend sigue en segundo plano.
    this.clearSession();
    void this.insforge.client.auth.signOut();
  }

  /**
   * Inicia sesión con Google. El SDK redirige al proveedor y, al volver a
   * /dashboard, intercambia el código automáticamente.
   */
  async loginWithGoogle(): Promise<boolean> {
    const { error } = await this.insforge.client.auth.signInWithOAuth('google', {
      redirectTo: `${window.location.origin}/dashboard`,
    });
    return !error;
  }

  private async refreshSession(): Promise<void> {
    const { data, error } = await this.insforge.client.auth.getCurrentUser();

    if (data?.user) {
      this.setSession(toSessionUser(data.user));
      return;
    }

    // Solo se borra si el backend confirmó que no hay sesión (401).
    if (error?.statusCode === 401) {
      this.clearSession();
    }
  }

  private setSession(user: SessionUser): void {
    this.currentUserState.set(user);
    saveToStorage(SESSION_KEY, user);
  }

  private clearSession(): void {
    this.currentUserState.set(null);
    localStorage.removeItem(SESSION_KEY);
  }
}
