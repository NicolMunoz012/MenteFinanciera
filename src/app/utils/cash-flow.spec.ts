import { Transaction, TransactionType } from '../models/transaction.model';
import { buildMonthlyCashFlow } from './cash-flow';

const TODAY = '2026-11-08';

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

describe('buildMonthlyCashFlow', () => {
  it('devuelve los últimos meses terminando en el mes actual', () => {
    const months = buildMonthlyCashFlow([], TODAY, 6);

    expect(months.map((month) => month.month)).toEqual([
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
    ]);
    expect(months[5].label).toBe('Nov');
  });

  it('suma ingresos y gastos por mes', () => {
    const months = buildMonthlyCashFlow(
      [
        transaction(1, 'income', 1000, '2026-09-10'),
        transaction(2, 'expense', 200, '2026-09-12'),
        transaction(3, 'expense', 50, '2026-10-01'),
        transaction(4, 'income', 300, '2026-11-07'),
      ],
      TODAY,
      6,
    );

    expect(months[3]).toMatchObject({ income: 1000, expenses: 200 });
    expect(months[4]).toMatchObject({ income: 0, expenses: 50 });
    expect(months[5]).toMatchObject({ income: 300, expenses: 0 });
  });

  it('no cuenta movimientos con fecha futura dentro del mes actual', () => {
    const months = buildMonthlyCashFlow(
      [
        transaction(1, 'expense', 100, '2026-11-08'),
        transaction(2, 'expense', 500, '2026-11-09'),
      ],
      TODAY,
      1,
    );

    expect(months[0].expenses).toBe(100);
  });
});
