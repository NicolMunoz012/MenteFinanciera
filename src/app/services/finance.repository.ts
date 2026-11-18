import { inject, Injectable } from '@angular/core';
import { InsforgeClient } from '../core/insforge';
import { Category } from '../models/category.model';
import { Goal } from '../models/goal.model';
import { Reminder } from '../models/reminder.model';
import { Transaction } from '../models/transaction.model';

/** Todos los datos de una cuenta, tal como llegan de la base de datos. */
export interface FinanceSnapshot {
  transactions: Transaction[];
  categories: Category[];
  goals: Goal[];
  reminders: Reminder[];
}

/* Filas de PostgreSQL (snake_case) y su conversión al modelo de Angular. */

interface TransactionRow {
  id: number;
  name: string;
  category: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  source: 'manual' | 'scan' | 'voice';
}

interface CategoryRow {
  id: number;
  name: string;
  budget: number;
}

interface GoalRow {
  id: number;
  name: string;
  target: number;
  saved: number;
  due_date: string;
}

interface ReminderRow {
  id: number;
  name: string;
  amount: number;
  due_date: string;
  is_paid: boolean;
}

const toTransaction = (row: TransactionRow): Transaction => ({
  id: row.id,
  name: row.name,
  category: row.category,
  type: row.type,
  amount: Number(row.amount),
  date: row.date,
  source: row.source,
});

const toCategory = (row: CategoryRow): Category => ({
  id: row.id,
  name: row.name,
  budget: Number(row.budget),
});

const toGoal = (row: GoalRow): Goal => ({
  id: row.id,
  name: row.name,
  target: Number(row.target),
  saved: Number(row.saved),
  dueDate: row.due_date,
});

const toReminder = (row: ReminderRow): Reminder => ({
  id: row.id,
  name: row.name,
  amount: Number(row.amount),
  dueDate: row.due_date,
  isPaid: row.is_paid,
});

const transactionToRow = (transaction: Transaction): TransactionRow => ({
  id: transaction.id,
  name: transaction.name,
  category: transaction.category,
  type: transaction.type,
  amount: transaction.amount,
  date: transaction.date,
  source: transaction.source,
});

const categoryToRow = (category: Category): CategoryRow => ({
  id: category.id,
  name: category.name,
  budget: category.budget,
});

const goalToRow = (goal: Goal): GoalRow => ({
  id: goal.id,
  name: goal.name,
  target: goal.target,
  saved: goal.saved,
  due_date: goal.dueDate,
});

const reminderToRow = (reminder: Reminder): ReminderRow => ({
  id: reminder.id,
  name: reminder.name,
  amount: reminder.amount,
  due_date: reminder.dueDate,
  is_paid: reminder.isPaid,
});

/**
 * Acceso a las tablas de InsForge.
 *
 * No se envía `user_id`: PostgreSQL lo llena con `auth.uid()` y las políticas
 * RLS hacen que cada usuario solo pueda leer y escribir sus propias filas.
 */
@Injectable({ providedIn: 'root' })
export class FinanceRepository {
  private readonly db = inject(InsforgeClient).client.database;

  /** Lee los datos de la cuenta con sesión. Devuelve null si hay error de red. */
  async loadAll(): Promise<FinanceSnapshot | null> {
    const [transactions, categories, goals, reminders] = await Promise.all([
      this.db.from('transactions').select('*').order('id'),
      this.db.from('categories').select('*').order('id'),
      this.db.from('goals').select('*').order('id'),
      this.db.from('reminders').select('*').order('id'),
    ]);

    if (transactions.error || categories.error || goals.error || reminders.error) {
      console.warn('[InsForge] No se pudieron cargar los datos', {
        transactions: transactions.error,
        categories: categories.error,
        goals: goals.error,
        reminders: reminders.error,
      });
      return null;
    }

    return {
      transactions: (transactions.data as TransactionRow[]).map(toTransaction),
      categories: (categories.data as CategoryRow[]).map(toCategory),
      goals: (goals.data as GoalRow[]).map(toGoal),
      reminders: (reminders.data as ReminderRow[]).map(toReminder),
    };
  }

  /** Primer ingreso de una cuenta: crea las categorías base. */
  async seedCategories(categories: Category[]): Promise<void> {
    await this.insertMany('categories', categories.map(categoryToRow));
  }

  async insertTransaction(transaction: Transaction): Promise<void> {
    await this.insertMany('transactions', [transactionToRow(transaction)]);
  }

  async deleteTransaction(userId: string, id: number): Promise<void> {
    await this.deleteRow('transactions', userId, id);
  }

  async insertCategory(category: Category): Promise<void> {
    await this.insertMany('categories', [categoryToRow(category)]);
  }

  async deleteCategory(userId: string, id: number): Promise<void> {
    await this.deleteRow('categories', userId, id);
  }

  /** Reemplaza los movimientos (se usa al borrar una categoría y reasignarlos). */
  async replaceTransactions(userId: string, transactions: Transaction[]): Promise<void> {
    const { error } = await this.db.from('transactions').delete().eq('user_id', userId);
    if (error) {
      console.warn('[InsForge] No se pudieron borrar los movimientos', error);
      return;
    }
    await this.insertMany('transactions', transactions.map(transactionToRow));
  }

  async insertGoal(goal: Goal): Promise<void> {
    await this.insertMany('goals', [goalToRow(goal)]);
  }

  async updateGoalSaved(userId: string, id: number, saved: number): Promise<void> {
    const { error } = await this.db
      .from('goals')
      .update({ saved })
      .eq('user_id', userId)
      .eq('id', id);
    if (error) {
      console.warn('[InsForge] No se pudo actualizar la meta', error);
    }
  }

  async deleteGoal(userId: string, id: number): Promise<void> {
    await this.deleteRow('goals', userId, id);
  }

  async insertReminder(reminder: Reminder): Promise<void> {
    await this.insertMany('reminders', [reminderToRow(reminder)]);
  }

  async updateReminderPaid(userId: string, id: number, isPaid: boolean): Promise<void> {
    const { error } = await this.db
      .from('reminders')
      .update({ is_paid: isPaid })
      .eq('user_id', userId)
      .eq('id', id);
    if (error) {
      console.warn('[InsForge] No se pudo actualizar el recordatorio', error);
    }
  }

  async deleteReminder(userId: string, id: number): Promise<void> {
    await this.deleteRow('reminders', userId, id);
  }

  private async insertMany<T>(table: string, rows: T[]): Promise<void> {
    if (rows.length === 0) {
      return;
    }
    const { error } = await this.db.from(table).insert(rows);
    if (error) {
      console.warn(`[InsForge] No se pudo guardar en ${table}`, error);
    }
  }

  private async deleteRow(table: string, userId: string, id: number): Promise<void> {
    const { error } = await this.db.from(table).delete().eq('user_id', userId).eq('id', id);
    if (error) {
      console.warn(`[InsForge] No se pudo borrar en ${table}`, error);
    }
  }
}
