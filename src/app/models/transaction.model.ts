export const INCOME_CATEGORY = 'Ingresos';

export type TransactionType = 'income' | 'expense';
export type TransactionSource = 'manual' | 'scan' | 'voice';

export interface Transaction {
  id: number;
  name: string;
  category: string;
  type: TransactionType;
  amount: number;
  date: string;
  source: TransactionSource;
}

export type NewTransaction = Omit<Transaction, 'id'>;
