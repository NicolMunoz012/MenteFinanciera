import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormField } from '../../components/form-field/form-field';
import { Navbar } from '../../components/navbar/navbar';
import { ProgressCard } from '../../components/progress-card/progress-card';
import { Topbar } from '../../components/topbar/topbar';
import { SpanishDatePipe } from '../../pipes/spanish-date';
import { FinanceService } from '../../services/finance.service';
import { confirmDelete } from '../../utils/confirm';
import { today } from '../../utils/dates';

@Component({
  selector: 'app-goals',
  imports: [CommonModule, ReactiveFormsModule, Navbar, Topbar, ProgressCard, FormField, SpanishDatePipe],
  templateUrl: './goals.html',
  styleUrl: './goals.scss',
})
export class Goals {
  private readonly finance = inject(FinanceService);
  private readonly formBuilder = inject(FormBuilder);

  readonly goals = this.finance.goals;

  readonly goalForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    target: [0, [Validators.required, Validators.min(1)]],
    dueDate: [today(), Validators.required],
  });

  readonly contributionForm = this.formBuilder.group({
    goalId: new FormControl<number | null>(null, Validators.required),
    amount: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0.01)] }),
  });

  submitGoal(): void {
    if (this.goalForm.invalid) {
      this.goalForm.markAllAsTouched();
      return;
    }
    this.finance.addGoal(this.goalForm.getRawValue());
    this.goalForm.reset();
  }

  submitContribution(): void {
    const { goalId, amount } = this.contributionForm.getRawValue();
    if (this.contributionForm.invalid || goalId === null) {
      this.contributionForm.markAllAsTouched();
      return;
    }
    this.finance.contributeToGoal(goalId, amount);
    this.contributionForm.reset();
  }

  remove(id: number): void {
    const goal = this.goals().find((item) => item.id === id);
    if (!goal || !confirmDelete(goal.name)) {
      return;
    }
    this.finance.deleteGoal(id);
  }
}
