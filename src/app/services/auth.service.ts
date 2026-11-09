import { Injectable, signal } from '@angular/core';
import DEMO_USERS from '../data/users.json';
import { NewUser, SessionUser, User } from '../models/user.model';
import { loadFromStorage, saveToStorage } from '../utils/storage';

const STORAGE_KEYS = {
  /** Usuarios creados desde la pantalla de registro (se suman a los de users.json). */
  users: 'mf.users',
  session: 'mf.session',
} as const;

/**
 * Autenticación de demostración en el navegador: valida contra los usuarios de
 * `data/users.json` y los registrados localmente. No es segura; reemplazar por
 * un backend real cuando exista.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly registeredUsers = signal(loadFromStorage<User[]>(STORAGE_KEYS.users, []));
  private readonly currentUserState = signal<SessionUser | null>(this.restoreSession());

  readonly currentUser = this.currentUserState.asReadonly();

  /** Devuelve true si el correo y la contraseña corresponden a un usuario. */
  login(email: string, password: string, remember = false): boolean {
    const user = this.findByEmail(email);
    if (!user || user.password !== password) {
      return false;
    }
    this.startSession(user, remember);
    return true;
  }

  /** Crea la cuenta e inicia sesión. Devuelve false si el correo ya está registrado. */
  register(data: NewUser): boolean {
    if (this.findByEmail(data.email)) {
      return false;
    }
    const all = this.allUsers();
    const user: User = {
      id: Math.max(0, ...all.map((u) => u.id)) + 1,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
      tier: 'FREE MEMBER',
    };
    const updated = [...this.registeredUsers(), user];
    this.registeredUsers.set(updated);
    saveToStorage(STORAGE_KEYS.users, updated);
    this.startSession(user, true);
    return true;
  }

  logout(): void {
    this.currentUserState.set(null);
    localStorage.removeItem(STORAGE_KEYS.session);
    sessionStorage.removeItem(STORAGE_KEYS.session);
  }

  private allUsers(): User[] {
    return [...(DEMO_USERS as User[]), ...this.registeredUsers()];
  }

  private findByEmail(email: string): User | undefined {
    const normalized = email.trim().toLowerCase();
    return this.allUsers().find((u) => u.email.toLowerCase() === normalized);
  }

  /** Con "Recuérdame" la sesión sobrevive al cerrar el navegador; si no, dura lo que la pestaña. */
  private startSession(user: User, remember: boolean): void {
    const { password: _password, ...session } = user;
    this.currentUserState.set(session);

    // Limpia la sesión anterior del otro almacenamiento para que no reviva al reabrir el navegador.
    localStorage.removeItem(STORAGE_KEYS.session);
    sessionStorage.removeItem(STORAGE_KEYS.session);

    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
  }

  private restoreSession(): SessionUser | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.session) ?? sessionStorage.getItem(STORAGE_KEYS.session);
      return raw ? (JSON.parse(raw) as SessionUser) : null;
    } catch {
      return null;
    }
  }
}
