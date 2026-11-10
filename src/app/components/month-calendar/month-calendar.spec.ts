import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Transaction } from '../../models/transaction.model';
import { MonthCalendar } from './month-calendar';

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

describe('MonthCalendar', () => {
  let component: MonthCalendar;
  let fixture: ComponentFixture<MonthCalendar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MonthCalendar] }).compileComponents();

    fixture = TestBed.createComponent(MonthCalendar);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('todayIso', '2026-11-09');
    fixture.componentRef.setInput('selectedDate', '2026-11-15');
    fixture.componentRef.setInput('transactions', []);
    fixture.detectChanges();
  });

  it('muestra el mes de la fecha seleccionada y permite navegar', () => {
    expect(component.monthLabel()).toContain('Noviembre');
    expect(component.calendarDays()[6]?.date).toBe('2026-11-01');

    component.changeMonth(-1);
    expect(component.monthLabel()).toContain('Octubre');

    component.goToToday();
    expect(component.monthLabel()).toContain('Noviembre');
  });

  it('emite la fecha elegida', () => {
    let selected = '';
    component.dateSelected.subscribe((date) => {
      selected = date;
    });

    component.selectDay('2026-11-05');

    expect(selected).toBe('2026-11-05');
  });

  it('el botón Hoy vuelve al mes actual y emite esa fecha', () => {
    let selected = '';
    component.dateSelected.subscribe((date) => {
      selected = date;
    });

    component.changeMonth(-1);
    component.changeMonth(-1);
    component.goToToday();

    expect(component.monthLabel()).toContain('Noviembre');
    expect(selected).toBe('2026-11-09');
  });

  it('describe los ingresos y gastos del día en el tooltip', () => {
    fixture.componentRef.setInput('transactions', [
      transaction(1, 'income', 1000, '2026-11-01'),
      transaction(2, 'expense', 500, '2026-11-01'),
    ]);
    fixture.detectChanges();

    const day = component.calendarDays().find((item) => item?.date === '2026-11-01');
    const label = day ? component.calendarLabel(day) : '';

    expect(label).toContain('Ingresos');
    expect(label).toContain('Gastos');
  });
});
