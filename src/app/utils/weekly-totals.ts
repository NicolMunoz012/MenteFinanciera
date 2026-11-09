import { Transaction } from '../models/transaction.model';
import { addDays, startOfWeek } from './dates';
import { balanceOf, sumByType } from './transaction-stats';

const WEEK_LENGTH = 7;

export interface WeeklyTotal {
  income: number;
  expenses: number;
  balance: number;
}

export function buildWeeklyTotals(
  transactions: Transaction[],
  todayIso: string,
  weeks: number,
): WeeklyTotal[] {
  const currentWeekStart = startOfWeek(todayIso);

  return Array.from({ length: weeks }, (_, index) => {
    const weekStart = addDays(currentWeekStart, -WEEK_LENGTH * (weeks - 1 - index));
    const weekEnd = addDays(weekStart, WEEK_LENGTH - 1);
    // La semana en curso no debe contar movimientos con fecha futura.
    const cutoff = weekEnd < todayIso ? weekEnd : todayIso;
    const inWeek = transactions.filter((t) => t.date >= weekStart && t.date <= cutoff);
    const untilCutoff = transactions.filter((t) => t.date <= cutoff);

    return {
      income: sumByType(inWeek, 'income'),
      expenses: sumByType(inWeek, 'expense'),
      balance: balanceOf(untilCutoff),
    };
  });
}
