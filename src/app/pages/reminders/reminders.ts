import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormField } from '../../components/form-field/form-field';
import { Navbar } from '../../components/navbar/navbar';
import { Topbar } from '../../components/topbar/topbar';
import { Reminder } from '../../models/reminder.model';
import { CopCurrencyPipe } from '../../pipes/cop-currency';
import { SpanishDatePipe } from '../../pipes/spanish-date';
import { FinanceService } from '../../services/finance.service';
import { confirmDelete } from '../../utils/confirm';
import { daysBetween, today } from '../../utils/dates';
import { REMINDER_WARNING_DAYS, describeDueDate } from '../../utils/reminders';

interface ReminderRow extends Reminder {
  daysLeft: number;
}

@Component({
  selector: 'app-reminders',
  imports: [CommonModule, ReactiveFormsModule, Navbar, Topbar, FormField, SpanishDatePipe, CopCurrencyPipe],
  templateUrl: './reminders.html',
  styleUrl: './reminders.scss',
})
export class Reminders {
  private readonly finance = inject(FinanceService);
  private readonly formBuilder = inject(FormBuilder);

  readonly rows = computed<ReminderRow[]>(() =>
    this.finance
      .sortedReminders()
      .map((reminder) => ({ ...reminder, daysLeft: daysBetween(today(), reminder.dueDate) })),
  );

  readonly reminderForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    dueDate: [today(), Validators.required],
  });

  submit(): void {
    if (this.reminderForm.invalid) {
      this.reminderForm.markAllAsTouched();
      return;
    }
    this.finance.addReminder(this.reminderForm.getRawValue());
    this.reminderForm.reset();
  }

  togglePaid(id: number): void {
    this.finance.togglePaid(id);
  }

  remove(id: number): void {
    const reminder = this.finance.reminders().find((item) => item.id === id);
    if (!reminder || !confirmDelete(reminder.name)) {
      return;
    }
    this.finance.deleteReminder(id);
  }

  dueLabel(row: ReminderRow): string {
    return row.isPaid ? 'Pagado' : describeDueDate(row.daysLeft);
  }

  dueClass(row: ReminderRow): string {
    if (row.isPaid) {
      return 'reminder__due--paid';
    }
    return row.daysLeft <= REMINDER_WARNING_DAYS ? 'reminder__due--soon' : '';
  }
}
