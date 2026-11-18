import { Transaction, TransactionType } from '../models/transaction.model';
import { balanceUpTo } from './transaction-stats';

function transaction(
  id: number,
  type: TransactionType,
  amount: number,
  date: string,
): Transaction {
  return {
    id,
    name: `Movimiento ${id}`,
    category: type === 'income' ? 'Ingresos' : 'Otros',
    type,
    amount,
    date,
    source: 'manual',
  };
}

describe('balanceUpTo', () => {
  it('ignora los movimientos con fecha futura', () => {
    const transactions = [
      transaction(1, 'income', 100, '2026-11-01'),
      transaction(2, 'expense', 30, '2026-11-05'),
      transaction(3, 'expense', 500, '2026-12-01'),
    ];

    expect(balanceUpTo(transactions, '2026-11-08')).toBe(70);
  });

  it('incluye los movimientos del mismo día', () => {
    const transactions = [
      transaction(1, 'income', 100, '2026-11-08'),
      transaction(2, 'expense', 40, '2026-11-08'),
    ];

    expect(balanceUpTo(transactions, '2026-11-08')).toBe(60);
  });
});
