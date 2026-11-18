import { Category } from '../models/category.model';

/**
 * Categorías con las que arranca una cuenta nueva.
 * Son solo la configuración inicial: no se crean movimientos, metas ni
 * recordatorios de ejemplo.
 */
export const SEED_CATEGORIES: Category[] = [
  { id: 1, name: 'Alimentos', budget: 1200000 },
  { id: 2, name: 'Transporte', budget: 400000 },
  { id: 3, name: 'Servicios', budget: 500000 },
  { id: 4, name: 'Entretenimiento', budget: 250000 },
  { id: 5, name: 'Salud', budget: 200000 },
  { id: 6, name: 'Otros', budget: 300000 },
];
