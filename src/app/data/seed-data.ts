import { Category } from '../models/category.model';
import { Goal } from '../models/goal.model';
import { Reminder } from '../models/reminder.model';
import { INCOME_CATEGORY, NewTransaction, Transaction } from '../models/transaction.model';
import { addDays, monthKey, previousMonthKey } from '../utils/dates';

function pad(day: number): string {
  return String(day).padStart(2, '0');
}

function dayOfCurrentMonth(todayIso: string, day: number): string {
  const todayDay = Number(todayIso.slice(8));
  return `${monthKey(todayIso)}-${pad(Math.min(day, todayDay))}`;
}

function dayOfPreviousMonth(todayIso: string, day: number): string {
  return `${previousMonthKey(todayIso)}-${pad(day)}`;
}

function income(name: string, amount: number, date: string): NewTransaction {
  return { name, category: INCOME_CATEGORY, type: 'income', amount, date, source: 'manual' };
}

function expense(name: string, category: string, amount: number, date: string): NewTransaction {
  return { name, category, type: 'expense', amount, date, source: 'manual' };
}

export const SEED_CATEGORIES: Category[] = [
  { id: 1, name: 'Alimentos', budget: 1200000 },
  { id: 2, name: 'Transporte', budget: 400000 },
  { id: 3, name: 'Servicios', budget: 500000 },
  { id: 4, name: 'Entretenimiento', budget: 250000 },
  { id: 5, name: 'Salud', budget: 200000 },
  { id: 6, name: 'Otros', budget: 300000 },
];

export function createSeedTransactions(todayIso: string): Transaction[] {
  const current = (day: number) => dayOfCurrentMonth(todayIso, day);
  const previous = (day: number) => dayOfPreviousMonth(todayIso, day);

  const transactions: NewTransaction[] = [
    income('Salario', 4500000, current(1)),
    income('Proyecto freelance', 1200000, current(15)),
    expense('Supermercado semanal', 'Alimentos', 180000, current(3)),
    expense('Almuerzo oficina', 'Alimentos', 28000, current(5)),
    expense('Cena con amigos', 'Alimentos', 85000, current(9)),
    expense('Supermercado semanal', 'Alimentos', 210000, current(16)),
    expense('Gasolina', 'Transporte', 150000, current(4)),
    expense('Taxi', 'Transporte', 25000, current(11)),
    expense('Gasolina', 'Transporte', 160000, current(19)),
    expense('Electricidad', 'Servicios', 180000, current(6)),
    expense('Internet', 'Servicios', 95000, current(7)),
    expense('Agua', 'Servicios', 65000, current(14)),
    expense('Suscripción Netflix', 'Entretenimiento', 32900, current(8)),
    expense('Cine', 'Entretenimiento', 55000, current(13)),
    expense('Farmacia', 'Salud', 85000, current(10)),
    expense('Regalo de cumpleaños', 'Otros', 250000, current(12)),
    expense('Café', 'Otros', 8000, addDays(todayIso, -1)),
    expense('Café', 'Otros', 8000, addDays(todayIso, -2)),
    expense('Café', 'Otros', 10000, addDays(todayIso, -4)),
    income('Salario', 4500000, previous(1)),
    income('Proyecto freelance', 800000, previous(18)),
    expense('Supermercado semanal', 'Alimentos', 420000, previous(6)),
    expense('Gasolina', 'Transporte', 280000, previous(8)),
    expense('Servicios del hogar', 'Servicios', 350000, previous(10)),
    expense('Suscripción Netflix', 'Entretenimiento', 32900, previous(12)),
    expense('Compras varias', 'Otros', 220000, previous(20)),
  ];

  return transactions.map((transaction, index) => ({ ...transaction, id: index + 1 }));
}

export function createSeedGoals(todayIso: string): Goal[] {
  return [
    { id: 1, name: 'Fondo de emergencia', target: 15000000, saved: 7200000, dueDate: addDays(todayIso, 90) },
    { id: 2, name: 'Viaje a Cartagena', target: 5000000, saved: 2500000, dueDate: addDays(todayIso, 120) },
    { id: 3, name: 'Laptop nueva', target: 6000000, saved: 1200000, dueDate: addDays(todayIso, 220) },
  ];
}

export function createSeedReminders(todayIso: string): Reminder[] {
  return [
    { id: 1, name: 'Suscripción Netflix', amount: 32900, dueDate: addDays(todayIso, 3), isPaid: false },
    { id: 2, name: 'Arriendo', amount: 1800000, dueDate: addDays(todayIso, 5), isPaid: false },
    { id: 3, name: 'Seguro del auto', amount: 250000, dueDate: addDays(todayIso, 10), isPaid: false },
    { id: 4, name: 'Internet', amount: 95000, dueDate: addDays(todayIso, 6), isPaid: false },
  ];
}