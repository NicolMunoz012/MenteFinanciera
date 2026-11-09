import { Kpi } from '../models/kpi.model';
import { Transaction } from '../models/transaction.model';
import { lastDayOfPreviousMonth, monthKey, previousMonthKey } from './dates';
import { formatCurrency, formatSignedPercent, percentChange } from './format';
import { buildSparkline } from './sparkline';
import { balanceOf, balanceUpTo, monthStats } from './transaction-stats';
import { buildWeeklyTotals } from './weekly-totals';

const SPARKLINE_WEEKS = 5;

function buildKpi(
  label: string,
  value: number,
  previousValue: number,
  higherIsBetter: boolean,
  series: number[],
): Kpi {
  const change = percentChange(value, previousValue);
  const isBadChange = higherIsBetter ? change < 0 : change > 0;

  return {
    label,
    value: formatCurrency(value),
    delta: formatSignedPercent(change),
    down: isBadChange,
    points: buildSparkline(series),
  };
}

export function buildKpis(transactions: Transaction[], todayIso: string): Kpi[] {
  const current = monthStats(transactions, monthKey(todayIso));
  const previous = monthStats(transactions, previousMonthKey(todayIso));
  const weeks = buildWeeklyTotals(transactions, todayIso, SPARKLINE_WEEKS);

  const balance = balanceUpTo(transactions, todayIso);
  const previousBalance = balanceOf(
    transactions.filter((transaction) => transaction.date <= lastDayOfPreviousMonth(todayIso)),
  );

  return [
    buildKpi('Saldo actual', balance, previousBalance, true, weeks.map((w) => w.balance)),
    buildKpi('Ingresos del mes', current.income, previous.income, true, weeks.map((w) => w.income)),
    buildKpi('Gastos del mes', current.expenses, previous.expenses, false, weeks.map((w) => w.expenses)),
    buildKpi(
      'Ahorro del mes',
      current.savings,
      previous.savings,
      true,
      weeks.map((w) => w.income - w.expenses),
    ),
  ];
}
