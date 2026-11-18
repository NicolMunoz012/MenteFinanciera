import { Transaction } from '../models/transaction.model';
import { parseISODate, shiftMonthKey } from './dates';
import { monthStats } from './transaction-stats';

export interface CashFlowMonth {
  month: string;
  label: string;
  income: number;
  expenses: number;
}

const MONTH_FORMATTER = new Intl.DateTimeFormat('es', { month: 'short' });

function monthLabel(month: string): string {
  // "sept" es la abreviatura de septiembre en español; se recorta a 3 letras
  // para que todas las etiquetas ocupen lo mismo.
  const text = MONTH_FORMATTER.format(parseISODate(`${month}-01`)).replace('.', '').slice(0, 3);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Ingresos y gastos de los últimos `months` meses, sin contar movimientos
 * con fecha futura. El último elemento es el mes actual.
 */
export function buildMonthlyCashFlow(
  transactions: Transaction[],
  todayIso: string,
  months: number,
): CashFlowMonth[] {
  const past = transactions.filter((transaction) => transaction.date <= todayIso);

  return Array.from({ length: months }, (_, index) => {
    const month = shiftMonthKey(todayIso, index - (months - 1));
    const stats = monthStats(past, month);
    return {
      month,
      label: monthLabel(month),
      income: stats.income,
      expenses: stats.expenses,
    };
  });
}
