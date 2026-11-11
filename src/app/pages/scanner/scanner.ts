import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormField } from '../../components/form-field/form-field';
import { Navbar } from '../../components/navbar/navbar';
import { Topbar } from '../../components/topbar/topbar';
import { CopCurrencyPipe } from '../../pipes/cop-currency';
import { SpanishDatePipe } from '../../pipes/spanish-date';
import { FinanceService } from '../../services/finance.service';
import { today } from '../../utils/dates';

@Component({
  selector: 'app-scanner',
  imports: [CommonModule, ReactiveFormsModule, Navbar, Topbar, FormField, SpanishDatePipe, CopCurrencyPipe],
  templateUrl: './scanner.html',
  styleUrl: './scanner.scss',
})
export class Scanner implements OnDestroy {
  private readonly finance = inject(FinanceService);
  private readonly formBuilder = inject(FormBuilder);

  readonly todayIso = today();
  readonly receiptPreview = signal<string | null>(null);
  readonly submitError = signal<string | null>(null);
  readonly receipts = this.finance.scannedReceipts;
  readonly categoryNames = computed(() => this.finance.categories().map((category) => category.name));

  readonly receiptForm = this.formBuilder.nonNullable.group({
    merchant: ['', [Validators.required, Validators.minLength(3)]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    category: ['', Validators.required],
    date: [this.todayIso, Validators.required],
  });

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    // Limpiar el input permite volver a elegir el mismo archivo tras descartarlo.
    input.value = '';

    if (!file) {
      return;
    }

    this.clearPreview();
    this.submitError.set(null);
    this.receiptPreview.set(URL.createObjectURL(file));
  }

  submit(): void {
    if (this.receiptForm.invalid) {
      this.receiptForm.markAllAsTouched();
      return;
    }

    const { merchant, amount, category, date } = this.receiptForm.getRawValue();
    const saved = this.finance.addTransaction({
      name: merchant,
      category,
      type: 'expense',
      amount,
      date,
      source: 'scan',
    });

    if (!saved) {
      this.submitError.set('No se pudo registrar el gasto. Revisa la categoría y el monto.');
      return;
    }

    this.discardReceipt();
  }

  discardReceipt(): void {
    this.clearPreview();
    this.receiptForm.reset();
    this.submitError.set(null);
  }

  ngOnDestroy(): void {
    this.clearPreview();
  }

  private clearPreview(): void {
    const previewUrl = this.receiptPreview();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    this.receiptPreview.set(null);
  }
}
