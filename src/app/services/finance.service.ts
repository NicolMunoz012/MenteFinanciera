import { computed, DestroyRef, effect, inject, Injectable, Signal, signal } from '@angular/core';
import { SEED_CATEGORIES } from '../data/seed-data';
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
import { FinanceRepository } from './finance.repository';

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
  private readonly repository = inject(FinanceRepository);
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

    const transaction: Transaction = { ...newTransaction, name, id: nextId(this.transactions()) };
    this.transactionsState.update((list) => [...list, transaction]);
    this.sync(() => this.repository.insertTransaction(transaction));
    return true;
  }

  deleteTransaction(id: number): void {
    this.transactionsState.update((list) => list.filter((transaction) => transaction.id !== id));
    this.sync(() => this.repository.deleteTransaction(this.owner(), id));
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
    const category = this.categories()[this.categories().length - 1];
    this.sync(() => this.repository.insertCategory(category));
    return true;
  }

  deleteCategory(id: number): void {
    const category = this.categories().find((item) => item.id === id);
    if (!category) {
      return;
    }

    this.categoriesState.update((list) => list.filter((item) => item.id !== id));
    this.sync(() => this.repository.deleteCategory(this.owner(), id));

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
    this.sync(() => this.repository.replaceTransactions(this.owner(), this.transactions()));
  }

  addGoal(newGoal: NewGoal): void {
    this.goalsState.update((list) => [...list, { ...newGoal, saved: 0, id: nextId(list) }]);
    const goal = this.goals()[this.goals().length - 1];
    this.sync(() => this.repository.insertGoal(goal));
  }

  contributeToGoal(id: number, amount: number): void {
    this.goalsState.update((list) =>
      list.map((goal) =>
        goal.id === id ? { ...goal, saved: Math.min(goal.target, goal.saved + amount) } : goal,
      ),
    );
    const goal = this.goals().find((item) => item.id === id);
    if (goal) {
      this.sync(() => this.repository.updateGoalSaved(this.owner(), id, goal.saved));
    }
  }

  deleteGoal(id: number): void {
    this.goalsState.update((list) => list.filter((goal) => goal.id !== id));
    this.sync(() => this.repository.deleteGoal(this.owner(), id));
  }

  addReminder(newReminder: NewReminder): void {
    this.remindersState.update((list) => [
      ...list,
      { ...newReminder, isPaid: false, id: nextId(list) },
    ]);
    const reminder = this.reminders()[this.reminders().length - 1];
    this.sync(() => this.repository.insertReminder(reminder));
  }

  togglePaid(id: number): void {
    this.remindersState.update((list) =>
      list.map((reminder) => (reminder.id === id ? { ...reminder, isPaid: !reminder.isPaid } : reminder)),
    );
    const reminder = this.reminders().find((item) => item.id === id);
    if (reminder) {
      this.sync(() => this.repository.updateReminderPaid(this.owner(), id, reminder.isPaid));
    }
  }

  deleteReminder(id: number): void {
    this.remindersState.update((list) => list.filter((reminder) => reminder.id !== id));
    this.sync(() => this.repository.deleteReminder(this.owner(), id));
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
      loadFromStorage(this.storageKey(owner, 'transactions'), []),
    );
    this.categoriesState.set(loadFromStorage(this.storageKey(owner, 'categories'), SEED_CATEGORIES));
    this.goalsState.set(loadFromStorage(this.storageKey(owner, 'goals'), []));
    this.remindersState.set(
      loadFromStorage(this.storageKey(owner, 'reminders'), []),
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

    // El localStorage es la caché (para pintar de inmediato); InsForge es la
    // fuente de verdad y se consulta justo después.
    if (owner !== 'guest') {
      void this.refreshFromBackend(owner);
    }
  }

  /**
   * Trae los datos del usuario desde InsForge. Si la cuenta no tiene
   * categorías (cuenta nueva), crea las categorías base y deja el resto vacío.
   */
  private async refreshFromBackend(owner: string): Promise<void> {
    const snapshot = await this.repository.loadAll();

    // El usuario cambió mientras la petición estaba en camino.
    if (!snapshot || this.loadedOwner !== owner) {
      return;
    }

    if (snapshot.categories.length === 0) {
      const defaults = SEED_CATEGORIES;
      await this.repository.seedCategories(defaults);
      snapshot.categories = defaults;
    }

    this.transactionsState.set(snapshot.transactions);
    this.categoriesState.set(snapshot.categories);
    this.goalsState.set(snapshot.goals);
    this.remindersState.set(snapshot.reminders);
  }

  /** Solo se escribe en InsForge cuando hay una cuenta real cargada. */
  private canSync(): boolean {
    const owner = this.owner();
    return owner !== 'guest' && owner === this.loadedOwner;
  }

  /** Guarda en la base de datos sin bloquear la interfaz. */
  private sync(save: () => Promise<void>): void {
    if (!this.canSync()) {
      return;
    }
    void save().catch((error) => console.warn('[InsForge] No se pudo guardar', error));
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
