/**
 * Pide confirmación antes de eliminar algo. Evita borrar datos por un clic
 * accidental sin agregar un componente de diálogo extra.
 */
export function confirmDelete(name: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`);
}
