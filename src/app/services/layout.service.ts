import { Injectable, signal } from '@angular/core';
import { loadFromStorage, saveToStorage } from '../utils/storage';

const STORAGE_KEY = 'mf.sidebarOpen';

/** Estado de la estructura de la página compartido entre todas las vistas (p. ej. si el navbar está visible). */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly sidebarOpenState = signal(loadFromStorage(STORAGE_KEY, true));

  readonly sidebarOpen = this.sidebarOpenState.asReadonly();

  toggleSidebar(): void {
    const open = !this.sidebarOpenState();
    this.sidebarOpenState.set(open);
    saveToStorage(STORAGE_KEY, open);
  }
}
