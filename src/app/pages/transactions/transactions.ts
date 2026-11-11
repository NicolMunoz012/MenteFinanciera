import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CalendarDialog } from '../../components/calendar-dialog/calendar-dialog';
import { FormField } from '../../components/form-field/form-field';
import { Navbar } from '../../components/navbar/navbar';
import { Topbar } from '../../components/topbar/topbar';
import { INCOME_CATEGORY, TransactionType } from '../../models/transaction.model';
import { CopCurrencyPipe } from '../../pipes/cop-currency';
import { SpanishDatePipe } from '../../pipes/spanish-date';
import { FinanceService } from '../../services/finance.service';
import { paginate, pageCount } from '../../utils/calendar';
import { confirmDelete } from '../../utils/confirm';
import { today } from '../../utils/dates';
import { sumByType } from '../../utils/transaction-stats';

const PAGE_SIZE = 6;

@Component({
  selector: 'app-transactions',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    Navbar,
    Topbar,
    FormField,
    SpanishDatePipe,
    CopCurrencyPipe,
    CalendarDialog,
  ],
  styleUrl: './transactions.scss',
  templateUrl: './transactions.html',
})
export class Transactions {
  private readonly finance = inject(FinanceService);
  private readonly formBuilder = inject(FormBuilder);

  readonly todayIso = today();
  readonly selectedDate = signal(this.todayIso);
  readonly isFormVisible = signal(false);
  readonly isCalendarOpen = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly pageSize = PAGE_SIZE;

  /** Todos los movimientos, usados por el calendario para pintar cada día. */
  readonly transactions = this.finance.transactions;

  /** Página actual del listado del día seleccionado. */
  readonly page = signal(1);

  /** Copia reactiva del tipo elegido para poder filtrar las categorías. */
  private readonly transactionType = signal<TransactionType>('expense');

  /** Movimientos del día, del más reciente al más antiguo. */
  readonly dayTransactions = computed(() =>
    this.finance
      .transactions()
      .filter((transaction) => transaction.date === this.selectedDate())
      .sort((first, second) => second.id - first.id),
  );

  readonly totalPages = computed(() => pageCount(this.dayTransactions().length, PAGE_SIZE));

  /** Página efectiva: si se borran movimientos, se ajusta a la última existente. */
  readonly currentPage = computed(() => Math.min(this.page(), this.totalPages()));

  readonly pagedTransactions = computed(() =>
    paginate(this.dayTransactions(), this.currentPage(), PAGE_SIZE),
  );

  readonly rangeStart = computed(() =>
    this.dayTransactions().length === 0 ? 0 : (this.currentPage() - 1) * PAGE_SIZE + 1,
  );

  readonly rangeEnd = computed(() =>
    Math.min(this.currentPage() * PAGE_SIZE, this.dayTransactions().length),
  );

  readonly daySummary = computed(() => {
    const income = sumByType(this.dayTransactions(), 'income');
    const expenses = sumByType(this.dayTransactions(), 'expense');
    return { income, expenses, balance: income - expenses };
  });

  readonly categoryOptions = computed(() =>
    this.transactionType() === 'income'
      ? [INCOME_CATEGORY]
      : this.finance.categories().map((category) => category.name),
  );

  readonly transactionForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    type: ['expense' as TransactionType, Validators.required],
    category: ['', Validators.required],
    date: [this.todayIso, Validators.required],
  });

  toggleForm(): void {
    this.isFormVisible.update((isVisible) => !isVisible);
    this.submitError.set(null);
  }

  openCalendar(): void {
    this.isCalendarOpen.set(true);
  }

  closeCalendar(): void {
    this.isCalendarOpen.set(false);
  }

  /** El calendario elige una fecha: se filtra el listado y se cierra la ventana. */
  onDateSelected(date: string): void {
    this.selectDay(date);
    this.closeCalendar();
  }

  selectDay(date: string): void {
    this.selectedDate.set(date);
    this.page.set(1);
  }

  goToPage(page: number): void {
    this.page.set(Math.min(Math.max(1, page), this.totalPages()));
  }

  /** Al cambiar de gasto a ingreso (o al revés) la categoría anterior deja de servir. */
  onTypeChange(): void {
    this.transactionType.set(this.transactionForm.controls.type.value);
    this.transactionForm.controls.category.setValue('');
    this.submitError.set(null);
  }

  submit(): void {
    if (this.transactionForm.invalid) {
      this.transactionForm.markAllAsTouched();
      return;
    }

    const transaction = this.transactionForm.getRawValue();
    const saved = this.finance.addTransaction({ ...transaction, source: 'manual' });

    if (!saved) {
      this.submitError.set('Revisa el tipo, la categoría y el monto del movimiento.');
      return;
    }

    this.submitError.set(null);
    this.selectedDate.set(transaction.date);
    // El listado muestra primero lo más reciente, así que el nuevo movimiento
    // queda visible en la primera página.
    this.page.set(1);
    this.transactionForm.reset();
    this.transactionType.set('expense');
    this.isFormVisible.set(false);
  }

  remove(id: number): void {
    const transaction = this.finance.transactions().find((item) => item.id === id);
    if (!transaction || !confirmDelete(transaction.name)) {
      return;
    }
    this.finance.deleteTransaction(id);
    this.page.set(Math.min(this.currentPage(), this.totalPages()));
  }
}
