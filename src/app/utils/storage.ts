export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Guarda un valor en localStorage sin romper la aplicación si el navegador
 * bloquea el almacenamiento (modo privado, cuota llena, permisos, etc.).
 * Devuelve false cuando no se pudo guardar.
 */
export function saveToStorage<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`No se pudo guardar "${key}" en el almacenamiento local.`, error);
    return false;
  }
}
