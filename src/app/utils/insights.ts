import { ChartItem } from '../models/chart.model';
import { formatCurrency, percentChange } from './format';
import { MonthStats } from './transaction-stats';

export function buildInsights(
  shares: ChartItem[],
  stats: MonthStats,
  previousExpenses: number,
): string[] {
  const insights: string[] = [];
  const [topShare] = shares;

  if (topShare) {
    insights.push(
      `Tu mayor gasto del mes es ${topShare.name}: ${formatCurrency(topShare.amount)} (${Math.round(topShare.percent)}% del total).`,
    );
  }

  if (stats.income > 0) {
    const savingsRate = Math.round((stats.savings / stats.income) * 100);
    insights.push(`Tu tasa de ahorro este mes es ${savingsRate}%.`);
  }

  if (previousExpenses > 0) {
    const change = percentChange(stats.expenses, previousExpenses);
    const direction = change >= 0 ? 'subieron' : 'bajaron';
    insights.push(`Tus gastos ${direction} ${Math.abs(Math.round(change))}% respecto al mes anterior.`);
  }

  return insights;
}
