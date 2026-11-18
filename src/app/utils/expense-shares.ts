import { ChartItem } from '../models/chart.model';
import { Transaction } from '../models/transaction.model';
import { sumByType } from './transaction-stats';

export const CHART_COLORS = ['#2F8F55', '#FF7A7A', '#B39CF9', '#F0B45E', '#6FA8FF', '#93A3BC'];

export function buildExpenseShares(monthTransactions: Transaction[]): ChartItem[] {
  const total = sumByType(monthTransactions, 'expense');
  const amountByCategory = new Map<string, number>();

  for (const transaction of monthTransactions) {
    if (transaction.type === 'expense') {
      const current = amountByCategory.get(transaction.category) ?? 0;
      amountByCategory.set(transaction.category, current + transaction.amount);
    }
  }

  return [...amountByCategory]
    .sort(([, amountA], [, amountB]) => amountB - amountA)
    .map(([name, amount], index) => ({
      name,
      amount,
      // Evita NaN cuando el total es 0 (por ejemplo, un gasto de monto 0).
      percent: total > 0 ? (amount / total) * 100 : 0,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
}
