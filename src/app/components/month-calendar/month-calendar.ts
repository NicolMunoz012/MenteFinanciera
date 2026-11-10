import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { Transaction } from '../../models/transaction.model';
import { buildMonthCalendar, CalendarDay } from '../../utils/calendar';
import { monthKey, parseISODate, shiftMonthKey, today } from '../../utils/dates';
import { formatCurrency } from '../../utils/format';

const WEEKDAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DATE_FORMATTER = new Intl.DateTimeFormat('es', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const MONTH_FORMATTER = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' });

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Calendario mensual reutilizable. Recibe los movimientos y la fecha
 * seleccionada, y avisa con `dateSelected` cuando el usuario elige un día.
 */
@Component({
  selector: 'app-month-calendar',
  imports: [CommonModule],
  templateUrl: './month-calendar.html',
  styleUrl: './month-calendar.scss',
})
export class MonthCalendar implements OnChanges {
  @Input() todayIso = today();
  @Input() selectedDate = '';
  @Input() transactions: Transaction[] = [];
  @Output() dateSelected = new EventEmitter<string>();

  readonly weekdayNames = WEEKDAY_NAMES;

  private readonly transactionsState = signal<Transaction[]>([]);
  private readonly visibleMonthState = signal(monthKey(this.todayIso));

  readonly monthLabel = computed(() =>
    capitalize(MONTH_FORMATTER.format(parseISODate(`${this.visibleMonthState()}-01`))),
  );

  readonly calendarDays = computed(() =>
    buildMonthCalendar(`${this.visibleMonthState()}-01`, this.transactionsState()),
  );

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['transactions']) {
      this.transactionsState.set(this.transactions ?? []);
    }
    // Al abrir el calendario (o cambiar la fecha desde fuera) se muestra el mes
    // de la fecha seleccionada.
    if (changes['selectedDate'] && this.selectedDate) {
      this.visibleMonthState.set(monthKey(this.selectedDate));
    }
  }

  changeMonth(direction: 1 | -1): void {
    this.visibleMonthState.update((month) => shiftMonthKey(month, direction));
  }

  goToToday(): void {
    this.visibleMonthState.set(monthKey(this.todayIso));
    this.dateSelected.emit(this.todayIso);
  }

  selectDay(date: string): void {
    this.dateSelected.emit(date);
  }

  /** Texto accesible y tooltip de cada día del calendario. */
  calendarLabel(day: CalendarDay): string {
    const parts = [capitalize(DATE_FORMATTER.format(parseISODate(day.date)))];
    if (day.income > 0) {
      parts.push(`Ingresos: ${formatCurrency(day.income)}`);
    }
    if (day.expenses > 0) {
      parts.push(`Gastos: ${formatCurrency(day.expenses)}`);
    }
    if (day.activity === 'none') {
      parts.push('Sin movimientos');
    }
    return parts.join('. ');
  }
}
