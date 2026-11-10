import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Navbar } from '../../components/navbar/navbar';
import { Topbar } from '../../components/topbar/topbar';
import { CopCurrencyPipe } from '../../pipes/cop-currency';
import { FinanceService } from '../../services/finance.service';

@Component({
  selector: 'app-analysis',
  imports: [CommonModule, Navbar, Topbar, CopCurrencyPipe],
  templateUrl: './analysis.html',
  styleUrl: './analysis.scss',
})
export class Analysis {
  private readonly finance = inject(FinanceService);

  readonly expenseShares = this.finance.expenseShares;
  readonly insights = this.finance.insights;
}
