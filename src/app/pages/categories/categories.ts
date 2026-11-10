import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormField } from '../../components/form-field/form-field';
import { Navbar } from '../../components/navbar/navbar';
import { ProgressCard } from '../../components/progress-card/progress-card';
import { Topbar } from '../../components/topbar/topbar';
import { FinanceService } from '../../services/finance.service';
import { confirmDelete } from '../../utils/confirm';

@Component({
  selector: 'app-categories',
  imports: [CommonModule, ReactiveFormsModule, Navbar, Topbar, ProgressCard, FormField],
  templateUrl: './categories.html',
  styleUrl: './categories.scss',
})
export class Categories {
  private readonly finance = inject(FinanceService);
  private readonly formBuilder = inject(FormBuilder);

  readonly budgets = this.finance.categoryBudgets;
  readonly error = signal<string | null>(null);

  readonly categoryForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    budget: [0, [Validators.required, Validators.min(1)]],
  });

  submit(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    const category = this.categoryForm.getRawValue();

    if (this.finance.isCategoryNameTaken(category.name)) {
      this.error.set('Ya existe una categoría con ese nombre. Usa uno diferente.');
      return;
    }

    if (!this.finance.addCategory(category)) {
      this.error.set('No se pudo crear la categoría. Revisa el nombre y el presupuesto.');
      return;
    }

    this.error.set(null);
    this.categoryForm.reset();
  }

  remove(id: number): void {
    const category = this.budgets().find((budget) => budget.id === id);
    if (!category || !confirmDelete(category.name)) {
      return;
    }
    this.finance.deleteCategory(id);
    this.error.set(null);
  }
}
