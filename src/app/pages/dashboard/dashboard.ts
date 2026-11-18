import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { AlertsCard } from '../../components/alerts-card/alerts-card';
import { CashFlowCard } from '../../components/cash-flow-card/cash-flow-card';
import { ExpenseDonutCard } from '../../components/expense-donut-card/expense-donut-card';
import { KpiCard } from '../../components/kpi-card/kpi-card';
import { Navbar } from '../../components/navbar/navbar';
import { Topbar } from '../../components/topbar/topbar';
import { VoiceAgentCard } from '../../components/voice-agent-card/voice-agent-card';
import { AuthService } from '../../services/auth.service';
import { FinanceService } from '../../services/finance.service';

const DASHBOARD_ALERTS_LIMIT = 2;

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    Navbar,
    Topbar,
    KpiCard,
    CashFlowCard,
    ExpenseDonutCard,
    VoiceAgentCard,
    AlertsCard,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly finance = inject(FinanceService);
  private readonly auth = inject(AuthService);

  readonly kpis = this.finance.kpis;
  readonly expenseShares = this.finance.expenseShares;
  readonly monthExpenses = computed(() => this.finance.monthTotals().expenses);
  readonly latestAlerts = computed(() => this.finance.alerts().slice(0, DASHBOARD_ALERTS_LIMIT));

  /** Saludo personalizado con el nombre del usuario que tiene la sesión activa. */
  readonly greeting = computed(() => {
    const firstName = this.auth.currentUser()?.name.trim().split(/\s+/)[0];
    return firstName ? `Hola de nuevo, ${firstName}` : 'Hola de nuevo';
  });
}
