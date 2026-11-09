import { AlertItem } from '../models/alert.model';
import { CategoryBudget } from '../models/category.model';
import { Goal } from '../models/goal.model';
import { Reminder } from '../models/reminder.model';
import { Transaction } from '../models/transaction.model';
import { addDays, daysBetween } from './dates';
import { formatCurrency } from './format';
import { REMINDER_WARNING_DAYS, describeDueDate } from './reminders';

export const ANT_EXPENSE_LIMIT = 10;
export const ANT_EXPENSE_MIN_COUNT = 3;
export const ANT_EXPENSE_WINDOW_DAYS = 7;

export function budgetAlerts(budgets: CategoryBudget[]): AlertItem[] {
  return budgets
    .filter((budget) => budget.over)
    .map((budget) => ({
      id: `budget-${budget.id}`,
      tag: 'Presupuesto',
      text: `Superaste el presupuesto de ${budget.name}: gastaste ${formatCurrency(budget.spent)} de ${formatCurrency(budget.budget)}.`,
    }));
}

export function reminderAlerts(reminders: Reminder[], todayIso: string): AlertItem[] {
  return reminders
    .filter((reminder) => !reminder.isPaid)
    .map((reminder) => ({ reminder, daysLeft: daysBetween(todayIso, reminder.dueDate) }))
    .filter(({ daysLeft }) => daysLeft <= REMINDER_WARNING_DAYS)
    .map(({ reminder, daysLeft }) => ({
      id: `reminder-${reminder.id}`,
      tag: 'Pago',
      text: `El pago de ${reminder.name} ${describeDueDate(daysLeft)}.`,
    }));
}

export function antExpenseAlerts(transactions: Transaction[], todayIso: string): AlertItem[] {
  // Ventana de 7 días contando hoy; nunca incluye movimientos con fecha futura.
  const windowStart = addDays(todayIso, -(ANT_EXPENSE_WINDOW_DAYS - 1));
  const antExpenses = transactions.filter(
    (t) =>
      t.type === 'expense' &&
      t.amount < ANT_EXPENSE_LIMIT &&
      t.date >= windowStart &&
      t.date <= todayIso,
  );

  if (antExpenses.length < ANT_EXPENSE_MIN_COUNT) {
    return [];
  }

  return [
    {
      id: 'ant-expenses',
      tag: 'Gasto hormiga',
      text: `Hiciste ${antExpenses.length} compras menores a ${formatCurrency(ANT_EXPENSE_LIMIT)} en los últimos ${ANT_EXPENSE_WINDOW_DAYS} días.`,
    },
  ];
}

export function goalAlerts(goals: Goal[]): AlertItem[] {
  return goals
    .filter((goal) => goal.saved >= goal.target)
    .map((goal) => ({
      id: `goal-${goal.id}`,
      tag: 'Meta',
      text: `¡Completaste tu meta "${goal.name}"!`,
    }));
}
