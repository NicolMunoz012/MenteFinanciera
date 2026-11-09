import { TestBed } from '@angular/core/testing';
import { INCOME_CATEGORY } from '../models/transaction.model';
import { today } from '../utils/dates';
import { AuthService } from './auth.service';
import { FinanceService } from './finance.service';

describe('FinanceService', () => {
  let service: FinanceService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(FinanceService);
  });

  it('starts with sample data', () => {
    expect(service.transactions().length).toBeGreaterThan(0);
    expect(service.categories().length).toBeGreaterThan(0);
  });

  it('usa la fecha real del día', () => {
    expect(service.todayIso()).toBe(today());
  });

  it('adds an expense to the month totals', () => {
    const before = service.monthTotals().expenses;

    const saved = service.addTransaction({
      name: 'Prueba',
      category: 'Salud',
      type: 'expense',
      amount: 20,
      date: today(),
      source: 'manual',
    });

    expect(saved).toBe(true);
    expect(service.monthTotals().expenses).toBe(before + 20);
  });

  it('rechaza un movimiento con tipo y categoría incompatibles', () => {
    const saved = service.addTransaction({
      name: 'Movimiento inválido',
      category: INCOME_CATEGORY,
      type: 'expense',
      amount: 10,
      date: today(),
      source: 'manual',
    });

    expect(saved).toBe(false);
  });

  it('rechaza montos en cero o negativos', () => {
    const saved = service.addTransaction({
      name: 'Sin monto',
      category: 'Salud',
      type: 'expense',
      amount: 0,
      date: today(),
      source: 'manual',
    });

    expect(saved).toBe(false);
  });

  it('raises a budget alert when a category goes over budget and lets the user dismiss it', () => {
    const health = service.categories().find((category) => category.name === 'Salud')!;

    service.addTransaction({
      name: 'Cirugía',
      category: 'Salud',
      type: 'expense',
      amount: health.budget + 1000,
      date: today(),
      source: 'manual',
    });
    const alertId = `budget-${health.id}`;
    expect(service.alerts().some((alert) => alert.id === alertId)).toBe(true);

    service.dismissAlert(alertId);
    expect(service.alerts().some((alert) => alert.id === alertId)).toBe(false);
  });

  it('stops alerting about a reminder once it is paid', () => {
    const dueSoon = service.reminders().find((reminder) => reminder.name === 'Suscripción Netflix')!;
    expect(service.alerts().some((alert) => alert.id === `reminder-${dueSoon.id}`)).toBe(true);

    service.togglePaid(dueSoon.id);

    expect(service.alerts().some((alert) => alert.id === `reminder-${dueSoon.id}`)).toBe(false);
  });

  it('never saves more than the goal target', () => {
    const goal = service.goals()[0];

    service.contributeToGoal(goal.id, goal.target * 10);

    expect(service.goals()[0].saved).toBe(goal.target);
  });

  it('no permite categorías repetidas ni el nombre reservado de ingresos', () => {
    expect(service.addCategory({ name: 'Alimentos', budget: 100 })).toBe(false);
    expect(service.addCategory({ name: '  alimentos  ', budget: 100 })).toBe(false);
    expect(service.addCategory({ name: INCOME_CATEGORY, budget: 100 })).toBe(false);
    expect(service.addCategory({ name: 'Mascotas', budget: 100 })).toBe(true);
  });

  it('mueve los movimientos a Otros al eliminar una categoría', () => {
    const food = service.categories().find((category) => category.name === 'Alimentos')!;

    service.deleteCategory(food.id);

    expect(service.transactions().some((transaction) => transaction.category === 'Alimentos')).toBe(false);
    expect(service.transactions().some((transaction) => transaction.category === 'Otros')).toBe(true);
  });

  it('separa los datos de cada cuenta que usa el navegador', () => {
    const auth = TestBed.inject(AuthService);

    auth.login('carlos@mentefinanciera.com', 'Carlos123*');
    TestBed.tick();

    service.addTransaction({
      name: 'Movimiento de Carlos',
      category: 'Salud',
      type: 'expense',
      amount: 15,
      date: today(),
      source: 'manual',
    });
    TestBed.tick();

    expect(localStorage.getItem('mf.user-1.transactions')).toContain('Movimiento de Carlos');

    auth.logout();
    TestBed.tick();
    auth.login('laura@mentefinanciera.com', 'Laura123*');
    TestBed.tick();

    expect(service.transactions().some((transaction) => transaction.name === 'Movimiento de Carlos')).toBe(
      false,
    );
  });
});
