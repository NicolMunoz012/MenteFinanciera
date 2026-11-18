import { Transaction } from '../models/transaction.model';
import { shiftMonthKeepingDay } from './dates';
import { buildMonthCalendar, pageCount, paginate } from './calendar';

function transaction(
  id: number,
  type: 'income' | 'expense',
  amount: number,
  date: string,
): Transaction {
  return {
    id,
    name: `Movimiento ${id}`,
    category: type === 'income' ? 'Ingresos' : 'Alimentos',
    type,
    amount,
    date,
    source: 'manual',
  };
}

describe('buildMonthCalendar', () => {
  it('empieza la semana en lunes y rellena los huecos del mes', () => {
    // El 1 de noviembre de 2026 es domingo: quedan 6 huecos antes.
    const cells = buildMonthCalendar('2026-11-15', []);

    expect(cells.slice(0, 6).every((cell) => cell === null)).toBe(true);
    expect(cells[6]?.date).toBe('2026-11-01');
    expect(cells.length % 7).toBe(0);
  });

  it('clasifica los días con ingresos, gastos o ambos', () => {
    const cells = buildMonthCalendar('2026-11-15', [
      transaction(1, 'income', 1000, '2026-11-01'),
      transaction(2, 'expense', 500, '2026-11-01'),
      transaction(3, 'expense', 100, '2026-11-02'),
      transaction(4, 'income', 50, '2026-11-03'),
    ]);
    const days = cells.filter((cell): cell is NonNullable<typeof cell> => cell !== null);

    expect(days[0]).toMatchObject({ activity: 'mixed', income: 1000, expenses: 500 });
    expect(days[0].incomeShare).toBe(67);
    expect(days[0].level).toBe(4);
    expect(days[1]).toMatchObject({ activity: 'expense', level: 3 });
    expect(days[2]).toMatchObject({ activity: 'income', level: 1 });
    expect(days[3]).toMatchObject({ activity: 'none', level: 0 });
  });

  it('ignora movimientos de otros meses', () => {
    const cells = buildMonthCalendar('2026-11-15', [
      transaction(1, 'expense', 999, '2026-10-31'),
      transaction(2, 'income', 999, '2026-12-01'),
    ]);

    expect(cells.filter(Boolean).every((day) => day?.activity === 'none')).toBe(true);
  });
});

describe('shiftMonthKeepingDay', () => {
  it('ajusta el día al último del mes cuando no existe', () => {
    expect(shiftMonthKeepingDay('2026-01-31', 1)).toBe('2026-02-28');
    expect(shiftMonthKeepingDay('2026-03-31', -1)).toBe('2026-02-28');
  });

  it('conserva el día cuando existe en el mes destino', () => {
    expect(shiftMonthKeepingDay('2026-11-09', -1)).toBe('2026-10-09');
    expect(shiftMonthKeepingDay('2026-11-09', 1)).toBe('2026-12-09');
  });
});

describe('paginación', () => {
  it('calcula el total de páginas con al menos una', () => {
    expect(pageCount(0, 6)).toBe(1);
    expect(pageCount(6, 6)).toBe(1);
    expect(pageCount(13, 6)).toBe(3);
  });

  it('devuelve sólo los elementos de la página pedida', () => {
    const items = Array.from({ length: 13 }, (_, index) => index + 1);

    expect(paginate(items, 1, 6)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(paginate(items, 3, 6)).toEqual([13]);
  });

  it('ajusta una página fuera de rango', () => {
    const items = [1, 2, 3];

    expect(paginate(items, 9, 2)).toEqual([3]);
    expect(paginate(items, 0, 2)).toEqual([1, 2]);
  });
});
