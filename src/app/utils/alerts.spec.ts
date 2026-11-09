import { Transaction } from '../models/transaction.model';
import { antExpenseAlerts } from './alerts';

const TODAY = '2026-11-08';

function smallExpense(id: number, date: string): Transaction {
  return {
    id,
    name: `Café ${id}`,
    category: 'Otros',
    type: 'expense',
    amount: 4.5,
    date,
    source: 'manual',
  };
}

describe('antExpenseAlerts', () => {
  it('cuenta los gastos pequeños de los últimos 7 días', () => {
    const transactions = [
      smallExpense(1, '2026-11-07'),
      smallExpense(2, '2026-11-06'),
      smallExpense(3, '2026-11-05'),
    ];

    const alerts = antExpenseAlerts(transactions, TODAY);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].text).toContain('3 compras');
  });

  it('no cuenta movimientos con fecha futura', () => {
    const transactions = [
      smallExpense(1, '2026-11-07'),
      smallExpense(2, '2026-11-06'),
      smallExpense(3, '2026-11-05'),
      smallExpense(4, '2026-11-09'),
      smallExpense(5, '2026-12-01'),
    ];

    expect(antExpenseAlerts(transactions, TODAY)[0].text).toContain('3 compras');
  });

  it('no cuenta un gasto que quedó fuera de la ventana', () => {
    const transactions = [
      smallExpense(1, '2026-11-07'),
      smallExpense(2, '2026-11-06'),
      smallExpense(3, '2026-11-01'),
    ];

    expect(antExpenseAlerts(transactions, TODAY)).toHaveLength(0);
  });
});
