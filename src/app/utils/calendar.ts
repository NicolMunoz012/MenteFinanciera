import { Transaction } from '../models/transaction.model';
import { lastDayOfMonth, monthKey, parseISODate } from './dates';

/** Tipo de actividad de un día, usada para pintar el calendario. */
export type CalendarActivity = 'none' | 'income' | 'expense' | 'mixed';

export interface CalendarDay {
  date: string;
  income: number;
  expenses: number;
  activity: CalendarActivity;
  /** Intensidad de 0 a 4 según el monto del día frente al mayor del mes. */
  level: number;
  /** Porcentaje de ingresos dentro del total del día (para la barra mixta). */
  incomeShare: number;
}

const DAYS_PER_WEEK = 7;
const MAX_LEVEL = 4;

interface DayTotals {
  income: number;
  expenses: number;
}

function activityOf(totals: DayTotals): CalendarActivity {
  if (totals.income > 0 && totals.expenses > 0) {
    return 'mixed';
  }
  if (totals.income > 0) {
    return 'income';
  }
  if (totals.expenses > 0) {
    return 'expense';
  }
  return 'none';
}

/**
 * Nivel visual (1 a 4) según la posición del monto del día frente a los demás
 * días del mes. Se usa un rango y no una regla lineal para que un movimiento
 * muy grande no deje el resto de días prácticamente sin color.
 */
function buildLevelScale(values: number[]): (value: number) => number {
  const sorted = values.filter((value) => value > 0).sort((first, second) => first - second);

  return (value: number): number => {
    if (value <= 0 || sorted.length === 0) {
      return 0;
    }
    if (sorted.length === 1) {
      return MAX_LEVEL;
    }
    const below = sorted.filter((item) => item < value).length;
    const ratio = below / (sorted.length - 1);
    return Math.min(MAX_LEVEL, Math.max(1, 1 + Math.round(ratio * (MAX_LEVEL - 1))));
  };
}

/**
 * Construye las celdas del mes con los totales de cada día. La semana empieza
 * en lunes y las posiciones vacías del principio y del final son `null`.
 */
export function buildMonthCalendar(
  isoDate: string,
  transactions: Transaction[],
): (CalendarDay | null)[] {
  const month = monthKey(isoDate);
  const firstDay = `${month}-01`;
  const totalDays = Number(lastDayOfMonth(firstDay).slice(8, 10));

  // getDay(): domingo = 0. Se convierte a una semana que empieza en lunes.
  const leadingBlanks = (parseISODate(firstDay).getDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK;

  const totalsByDate = new Map<string, DayTotals>();
  for (const transaction of transactions) {
    if (monthKey(transaction.date) !== month) {
      continue;
    }
    const totals = totalsByDate.get(transaction.date) ?? { income: 0, expenses: 0 };
    if (transaction.type === 'income') {
      totals.income += transaction.amount;
    } else {
      totals.expenses += transaction.amount;
    }
    totalsByDate.set(transaction.date, totals);
  }

  const levelFor = buildLevelScale(
    Array.from(totalsByDate.values(), (totals) => Math.max(totals.income, totals.expenses)),
  );

  const cells: (CalendarDay | null)[] = Array.from({ length: leadingBlanks }, () => null);

  for (let day = 1; day <= totalDays; day++) {
    const date = `${month}-${String(day).padStart(2, '0')}`;
    const totals = totalsByDate.get(date) ?? { income: 0, expenses: 0 };
    const dayTotal = totals.income + totals.expenses;

    cells.push({
      date,
      income: totals.income,
      expenses: totals.expenses,
      activity: activityOf(totals),
      level: levelFor(Math.max(totals.income, totals.expenses)),
      incomeShare: dayTotal > 0 ? Math.round((totals.income / dayTotal) * 100) : 0,
    });
  }

  // Celdas vacías al final para completar la última semana.
  while (cells.length % DAYS_PER_WEEK !== 0) {
    cells.push(null);
  }

  return cells;
}

/** Cantidad de páginas necesarias para mostrar `total` elementos. */
export function pageCount(total: number, pageSize: number): number {
  if (pageSize <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Corta la lista en la página indicada (1-based) y ajusta páginas fuera de rango. */
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const totalPages = pageCount(items.length, pageSize);
  const current = Math.min(Math.max(1, Math.trunc(page) || 1), totalPages);
  const start = (current - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
