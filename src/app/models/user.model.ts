export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  tier: string;
}

/** Datos del usuario que quedan en la sesión (nunca se guarda la contraseña). */
export type SessionUser = Omit<User, 'password'>;

export type NewUser = Pick<User, 'name' | 'email' | 'password'>;
