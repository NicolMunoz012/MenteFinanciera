/** Usuario con sesión activa, tal como lo consumen las pantallas. */
export interface SessionUser {
  /** id de InsForge (UUID). */
  id: string;
  name: string;
  email: string;
  tier: string;
}

export type NewUser = Pick<SessionUser, 'name' | 'email'> & { password: string };
