import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { Navbar } from '../../components/navbar/navbar';
import { Topbar } from '../../components/topbar/topbar';
import { Transaction } from '../../models/transaction.model';
import { CopCurrencyPipe } from '../../pipes/cop-currency';
import { SpanishDatePipe } from '../../pipes/spanish-date';
import { FinanceService } from '../../services/finance.service';

@Component({
  selector: 'app-search',
  imports: [CommonModule, Navbar, Topbar, CopCurrencyPipe, SpanishDatePipe],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class Search {
  private readonly finance = inject(FinanceService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** El término vive en la URL para que se pueda compartir o recargar. */
  readonly query = toSignal(
    this.route.queryParamMap.pipe(map((params) => (params.get('q') ?? '').trim())),
    { initialValue: '' },
  );

  readonly results = computed<Transaction[]>(() => {
    const term = this.query().toLowerCase();
    if (term.length === 0) {
      return [];
    }

    return this.finance
      .transactions()
      .filter((transaction) =>
        [
          transaction.name,
          transaction.category,
          transaction.date,
          transaction.type === 'income' ? 'ingreso' : 'gasto',
          transaction.source === 'scan' ? 'escaneado' : transaction.source === 'voice' ? 'voz' : 'manual',
          String(transaction.amount),
        ].some((value) => value.toLowerCase().includes(term)),
      )
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  });

  readonly hasQuery = computed(() => this.query().length > 0);

  search(term: string, event: Event): void {
    event.preventDefault();
    const cleaned = term.trim();

    this.router.navigate(['/buscar'], {
      queryParams: cleaned.length > 0 ? { q: cleaned } : {},
    });
  }
}
