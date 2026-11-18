import { Transaction } from '../models/transaction.model';
import { buildExpenseShares } from './expense-shares';

function expense(id: number, category: string, amount: number): Transaction {
  return {
    id,
    name: `Gasto ${id}`,
    category,
    type: 'expense',
    amount,
    date: '2026-11-08',
    source: 'manual',
  };
}

describe('buildExpenseShares', () => {
  it('agrupa y ordena los gastos por categoría', () => {
    const shares = buildExpenseShares([
      expense(1, 'Alimentos', 100),
      expense(2, 'Alimentos', 50),
      expense(3, 'Transporte', 30),
    ]);

    expect(shares.map((share) => share.name)).toEqual(['Alimentos', 'Transporte']);
    expect(shares[0]).toMatchObject({ amount: 150, percent: 83.33333333333334 });
  });

  it('no produce NaN cuando el total es cero', () => {
    const shares = buildExpenseShares([expense(1, 'Otros', 0)]);

    expect(shares[0].percent).toBe(0);
    expect(Number.isNaN(shares[0].percent)).toBe(false);
  });
});
