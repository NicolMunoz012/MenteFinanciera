import { Injectable, computed, signal } from '@angular/core';
import { loadFromStorage, saveToStorage } from '../utils/storage';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'mf.theme';

/**
 * Preferencia de tema clara/oscura compartida por toda la aplicación.
 * Se guarda en localStorage (es una preferencia del dispositivo, no del usuario)
 * y se aplica con el atributo data-theme en <html>, que activa los tokens de color.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly themeState = signal<Theme>(loadFromStorage<Theme>(STORAGE_KEY, 'dark'));

  readonly theme = this.themeState.asReadonly();
  readonly isLight = computed(() => this.themeState() === 'light');

  constructor() {
    this.applyTheme(this.themeState());
  }

  toggleTheme(): void {
    this.setTheme(this.themeState() === 'light' ? 'dark' : 'light');
  }

  setTheme(theme: Theme): void {
    this.themeState.set(theme);
    saveToStorage(STORAGE_KEY, theme);
    this.applyTheme(theme);
  }

  private applyTheme(theme: Theme): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.setAttribute('data-theme', theme);
  }
}
