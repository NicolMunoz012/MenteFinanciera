import { computed, DestroyRef, effect, inject, Injectable, Signal, signal } from '@angular/core';
import { SEED_CATEGORIES, createSeedGoals, createSeedReminders, createSeedTransactions } from '../data/seed-data';
import { NewCategory, Category } from '../models/category.model';
import { NewGoal, Goal } from '../models/goal.model';
import { NewReminder, Reminder } from '../models/reminder.model';
import { INCOME_CATEGORY, NewTransaction, Transaction } from '../models/transaction.model';
import { antExpenseAlerts, budgetAlerts, goalAlerts, reminderAlerts } from '../utils/alerts';
import { buildCategoryBudgets } from '../utils/category-budgets';
import { monthKey, previousMonthKey, today } from '../utils/dates';
import { buildExpenseShares } from '../utils/expense-shares';
import { nextId } from '../utils/ids';
import { buildInsights } from '../utils/insights';
import { buildKpis } from '../utils/kpis';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { inMonth, monthStats } from '../utils/transaction-stats';
import { AuthService } from './auth.service';

type StorageName = 'transactions' | 'categories' | 'goals' | 'reminders' | 'dismissedAlerts';

interface DismissedAlerts {
  /** Mes al que pertenecen los descartes (YYYY-MM). */
  period: string;
  ids: string[];
}

/** Cada cuenta guarda sus datos bajo su propio prefijo. */
const STORAGE_PREFIX = 'mf';
const FALLBACK_CATEGORY = 'Otros';
const SCANNED_RECEIPTS_LIMIT = 5;

/** Alertas que no dependen del mes y se mantienen descartadas. */
function isPermanentAlert(id: string): boolean {
  return id.startsWith('reminder-') || id.startsWith('goal-');
}

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  /** Se refresca cada minuto para no quedarse con el día anterior. */
  private readonly todayState = signal(today());
  readonly todayIso = this.todayState.asReadonly();

  private readonly currentMonth = computed(() => monthKey(this.todayState()));

  /** Dueño de los datos: la cuenta con sesión o "guest" si no hay ninguna. */
  private readonly owner = computed(() => {
    const user = this.auth.currentUser();
    return user ? `user-${user.id}` : 'guest';
  });

  /** Evita guardar los datos de una cuenta bajo las claves de otra. */
  private loadedOwner: string | null = null;

  private readonly transactionsState = signal<Transaction[]>([]);
  private readonly categoriesState = signal<Category[]>([]);
  private readonly goalsState = signal<Goal[]>([]);
  private readonly remindersState = signal<Reminder[]>([]);
  private readonly dismissedAlertsState = signal<DismissedAlerts>({ period: '', ids: [] });

  readonly transactions = this.transactionsState.asReadonly();
  readonly categories = this.categoriesState.asReadonly();
  readonly goals = this.goalsState.asReadonly();
  readonly reminders = this.remindersState.asReadonly();

  private readonly monthTransactions = computed(() => inMonth(this.transactions(), this.currentMonth()));
  readonly monthTotals = computed(() => monthStats(this.transactions(), this.currentMonth()));

  readonly kpis = computed(() => buildKpis(this.transactions(), this.todayState()));
  readonly categoryBudgets = computed(() => buildCategoryBudgets(this.categories(), this.monthTransactions()));
  readonly expenseShares = computed(() => buildExpenseShares(this.monthTransactions()));

  readonly insights = computed(() => {
    const previousExpenses = monthStats(this.transactions(), previousMonthKey(this.todayState())).expenses;
    return buildInsights(this.expenseShares(), this.monthTotals(), previousExpenses);
  });

  readonly sortedReminders = computed(() =>
    [...this.reminders()].sort(
      (a, b) => Number(a.isPaid) - Number(b.isPaid) || a.dueDate.localeCompare(b.dueDate),
    ),
  );

  readonly scannedReceipts = computed(() =>
    this.transactions()
      .filter((transaction) => transaction.source === 'scan')
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, SCANNED_RECEIPTS_LIMIT),
  );

  readonly alerts = computed(() => {
    const dismissed = this.dismissedIds();
    const allAlerts = [
      ...budgetAlerts(this.categoryBudgets()),
      ...reminderAlerts(this.reminders(), this.todayState()),
      ...antExpenseAlerts(this.transactions(), this.todayState()),
      ...goalAlerts(this.goals()),
    ];
    return allAlerts.filter((alert) => !dismissed.includes(alert.id));
  });

  constructor() {
    this.loadFor(this.owner());

    // Login/logout: recarga el espacio de datos de la cuenta activa.
    effect(() => {
      const owner = this.owner();
      if (owner !== this.loadedOwner) {
        this.loadFor(owner);
      }
    });

    this.persistOnChange('transactions', this.transactions);
    this.persistOnChange('categories', this.categories);
    this.persistOnChange('goals', this.goals);
    this.persistOnChange('reminders', this.reminders);
    this.persistOnChange('dismissedAlerts', this.dismissedAlertsState);

    const timer = setInterval(() => {
      const current = today();
      if (current !== this.todayState()) {
        this.todayState.set(current);
      }
    }, 60_000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  /** Devuelve false si el movimiento no es válido (tipo/categoría, monto o fecha). */
  addTransaction(newTransaction: NewTransaction): boolean {
    const name = newTransaction.name.trim();
    const isIncome = newTransaction.type === 'income';
    const usesIncomeCategory = newTransaction.category === INCOME_CATEGORY;

    if (name.length === 0 || !Number.isFinite(newTransaction.amount) || newTransaction.amount <= 0) {
      return false;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newTransaction.date)) {
      return false;
    }
    // Un ingreso usa la categoría de ingresos; un gasto, una categoría real.
    if (isIncome !== usesIncomeCategory) {
      return false;
    }
    if (!isIncome && !this.categories().some((category) => category.name === newTransaction.category)) {
      return false;
    }

    this.transactionsState.update((list) => [
      ...list,
      { ...newTransaction, name, id: nextId(list) },
    ]);
    return true;
  }

  deleteTransaction(id: number): void {
    this.transactionsState.update((list) => list.filter((transaction) => transaction.id !== id));
  }

  /** Indica si el nombre ya existe (sin distinguir mayúsculas) o está reservado. */
  isCategoryNameTaken(name: string): boolean {
    const normalized = name.trim().toLowerCase();
    if (normalized === INCOME_CATEGORY.toLowerCase()) {
      return true;
    }
    return this.categories().some(
      (category) => category.name.trim().toLowerCase() === normalized,
    );
  }

  /** Devuelve false si el nombre está repetido o el presupuesto no es válido. */
  addCategory(newCategory: NewCategory): boolean {
    const name = newCategory.name.trim();

    if (name.length === 0 || !Number.isFinite(newCategory.budget) || newCategory.budget <= 0) {
      return false;
    }
    if (this.isCategoryNameTaken(name)) {
      return false;
    }

    this.categoriesState.update((list) => [...list, { ...newCategory, name, id: nextId(list) }]);
    return true;
  }

  deleteCategory(id: number): void {
    const category = this.categories().find((item) => item.id === id);
    if (!category) {
      return;
    }

    this.categoriesState.update((list) => list.filter((item) => item.id !== id));

    // Los movimientos no quedan apuntando a una categoría que ya no existe.
    const fallback =
      this.categories().find((item) => item.name === FALLBACK_CATEGORY) ?? this.categories()[0];
    if (!fallback) {
      return;
    }

    this.transactionsState.update((list) =>
      list.map((transaction) =>
        transaction.category === category.name
          ? { ...transaction, category: fallback.name }
          : transaction,
      ),
    );
  }

  addGoal(newGoal: NewGoal): void {
    this.goalsState.update((list) => [...list, { ...newGoal, saved: 0, id: nextId(list) }]);
  }

  contributeToGoal(id: number, amount: number): void {
    this.goalsState.update((list) =>
      list.map((goal) =>
        goal.id === id ? { ...goal, saved: Math.min(goal.target, goal.saved + amount) } : goal,
      ),
    );
  }

  deleteGoal(id: number): void {
    this.goalsState.update((list) => list.filter((goal) => goal.id !== id));
  }

  addReminder(newReminder: NewReminder): void {
    this.remindersState.update((list) => [...list, { ...newReminder, isPaid: false, id: nextId(list) }]);
  }

  togglePaid(id: number): void {
    this.remindersState.update((list) =>
      list.map((reminder) => (reminder.id === id ? { ...reminder, isPaid: !reminder.isPaid } : reminder)),
    );
  }

  deleteReminder(id: number): void {
    this.remindersState.update((list) => list.filter((reminder) => reminder.id !== id));
  }

  dismissAlert(id: string): void {
    this.dismissedAlertsState.update((state) => {
      const month = this.currentMonth();
      const ids = state.period === month ? state.ids : state.ids.filter(isPermanentAlert);
      return { period: month, ids: ids.includes(id) ? ids : [...ids, id] };
    });
  }

  private loadFor(owner: string): void {
    this.loadedOwner = owner;
    const todayValue = this.todayState();
    const month = monthKey(todayValue);

    this.transactionsState.set(
      loadFromStorage(this.storageKey(owner, 'transactions'), createSeedTransactions(todayValue)),
    );
    this.categoriesState.set(loadFromStorage(this.storageKey(owner, 'categories'), SEED_CATEGORIES));
    this.goalsState.set(loadFromStorage(this.storageKey(owner, 'goals'), createSeedGoals(todayValue)));
    this.remindersState.set(
      loadFromStorage(this.storageKey(owner, 'reminders'), createSeedReminders(todayValue)),
    );
    this.dismissedAlertsState.set(
      this.normalizeDismissed(
        loadFromStorage<DismissedAlerts | string[]>(this.storageKey(owner, 'dismissedAlerts'), {
          period: month,
          ids: [],
        }),
        month,
      ),
    );
  }

  /** En un mes nuevo vuelven a mostrarse las alertas de presupuesto y gasto-hormiga. */
  private normalizeDismissed(stored: DismissedAlerts | string[], month: string): DismissedAlerts {
    // Versión anterior: solo se guardaba el arreglo de ids.
    if (Array.isArray(stored)) {
      return { period: month, ids: stored };
    }
    if (stored.period === month) {
      return stored;
    }
    return { period: month, ids: stored.ids.filter(isPermanentAlert) };
  }

  private dismissedIds(): string[] {
    const state = this.dismissedAlertsState();
    return state.period === this.currentMonth() ? state.ids : state.ids.filter(isPermanentAlert);
  }

  private storageKey(owner: string, name: StorageName): string {
    return `${STORAGE_PREFIX}.${owner}.${name}`;
  }

  private persistOnChange<T>(name: StorageName, state: Signal<T>): void {
    effect(() => {
      const owner = this.owner();
      const value = state();
      // Al cambiar de cuenta, este efecto puede ejecutarse antes de cargar los
      // datos nuevos: en ese caso no se guarda nada.
      if (owner !== this.loadedOwner) {
        return;
      }
      saveToStorage(this.storageKey(owner, name), value);
    });
  }
}
