import { Transaction, TransactionType } from '../models/transaction.model';
import { monthKey } from './dates';

export interface MonthStats {
  income: number;
  expenses: number;
  savings: number;
}

export function sumByType(transactions: Transaction[], type: TransactionType): number {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((total, transaction) => total + transaction.amount, 0);
}

export function balanceOf(transactions: Transaction[]): number {
  return sumByType(transactions, 'income') - sumByType(transactions, 'expense');
}

/**
 * Saldo real a una fecha: ignora los movimientos registrados para días futuros.
 */
export function balanceUpTo(transactions: Transaction[], isoDate: string): number {
  return balanceOf(transactions.filter((transaction) => transaction.date <= isoDate));
}

export function inMonth(transactions: Transaction[], month: string): Transaction[] {
  return transactions.filter((transaction) => monthKey(transaction.date) === month);
}

export function monthStats(transactions: Transaction[], month: string): MonthStats {
  const monthTransactions = inMonth(transactions, month);
  const income = sumByType(monthTransactions, 'income');
  const expenses = sumByType(monthTransactions, 'expense');
  return { income, expenses, savings: income - expenses };
}
