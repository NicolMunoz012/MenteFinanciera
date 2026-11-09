import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    auth = TestBed.inject(AuthService);
  });

  it('inicia sesión con los usuarios de users.json', () => {
    expect(auth.login('carlos@mentefinanciera.com', 'Carlos123*')).toBe(true);
    expect(auth.currentUser()?.name).toBe('Carlos Ruiz');

    expect(auth.login('  LAURA@mentefinanciera.com ', 'Laura123*')).toBe(true);
    expect(auth.currentUser()?.name).toBe('Laura Gómez');
  });

  it('rechaza una contraseña incorrecta o un correo desconocido', () => {
    expect(auth.login('carlos@mentefinanciera.com', 'otra')).toBe(false);
    expect(auth.login('nadie@ejemplo.com', 'Carlos123*')).toBe(false);
    expect(auth.currentUser()).toBeNull();
  });

  it('no guarda la contraseña en la sesión', () => {
    auth.login('carlos@mentefinanciera.com', 'Carlos123*', true);
    expect(localStorage.getItem('mf.session')).not.toContain('Carlos123*');
  });

  it('al entrar sin "Recuérdame" no deja viva una sesión anterior', () => {
    auth.login('carlos@mentefinanciera.com', 'Carlos123*', true);
    expect(localStorage.getItem('mf.session')).not.toBeNull();

    auth.login('laura@mentefinanciera.com', 'Laura123*', false);
    expect(localStorage.getItem('mf.session')).toBeNull();
    expect(sessionStorage.getItem('mf.session')).toContain('Laura');
  });

  it('registra usuarios nuevos y no permite correos repetidos', () => {
    expect(auth.register({ name: 'Ana', email: 'ana@ejemplo.com', password: 'Secreta123' })).toBe(true);
    expect(auth.currentUser()?.email).toBe('ana@ejemplo.com');
    expect(auth.login('ana@ejemplo.com', 'Secreta123')).toBe(true);

    expect(auth.register({ name: 'Otro', email: 'carlos@mentefinanciera.com', password: 'x12345678' })).toBe(false);
  });
});
