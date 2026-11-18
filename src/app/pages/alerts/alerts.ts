import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Navbar } from '../../components/navbar/navbar';
import { Topbar } from '../../components/topbar/topbar';
import { FinanceService } from '../../services/finance.service';

@Component({
  selector: 'app-alerts',
  imports: [CommonModule, Navbar, Topbar],
  templateUrl: './alerts.html',
  styleUrl: './alerts.scss',
})
export class Alerts {
  private readonly finance = inject(FinanceService);

  readonly alerts = this.finance.alerts;

  dismiss(id: string): void {
    this.finance.dismissAlert(id);
  }
}
