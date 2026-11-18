import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    TestBed.configureTestingModule({});
  });

  it('empieza en modo oscuro y lo aplica en el documento', () => {
    const theme = TestBed.inject(ThemeService);

    expect(theme.theme()).toBe('dark');
    expect(theme.isLight()).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('alterna al modo claro y lo recuerda', () => {
    const theme = TestBed.inject(ThemeService);

    theme.toggleTheme();

    expect(theme.theme()).toBe('light');
    expect(theme.isLight()).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('mf.theme')).toBe('"light"');
  });

  it('permite fijar un tema concreto', () => {
    const theme = TestBed.inject(ThemeService);

    theme.setTheme('light');
    theme.setTheme('dark');

    expect(theme.theme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
