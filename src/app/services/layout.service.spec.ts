import { TestBed } from '@angular/core/testing';
import { LayoutService } from './layout.service';

describe('LayoutService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('muestra el menú por defecto y lo alterna', () => {
    const layout = TestBed.inject(LayoutService);
    expect(layout.sidebarOpen()).toBe(true);

    layout.toggleSidebar();
    expect(layout.sidebarOpen()).toBe(false);

    layout.toggleSidebar();
    expect(layout.sidebarOpen()).toBe(true);
  });

  it('recuerda si el menú quedó oculto', () => {
    TestBed.inject(LayoutService).toggleSidebar();
    expect(localStorage.getItem('mf.sidebarOpen')).toBe('false');
  });
});
