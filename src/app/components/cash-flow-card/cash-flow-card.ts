import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FinanceService } from '../../services/finance.service';
import { CashFlowMonth, buildMonthlyCashFlow } from '../../utils/cash-flow';

const MONTHS = 6;
const PLOT_LEFT = 50;
const PLOT_RIGHT = 568;
const PLOT_TOP = 40;
const PLOT_BOTTOM = 180;

interface ChartPoint {
  x: number;
  y: number;
}

interface CashFlowChart {
  months: CashFlowMonth[];
  incomePoints: string;
  expensePoints: string;
  areaPoints: string;
  hasData: boolean;
}

@Component({
  selector: 'app-cash-flow-card',
  imports: [CommonModule],
  templateUrl: './cash-flow-card.html',
  styleUrl: './cash-flow-card.scss',
})
export class CashFlowCard {
  private readonly finance = inject(FinanceService);

  readonly chart = computed<CashFlowChart>(() => {
    const months = buildMonthlyCashFlow(this.finance.transactions(), this.finance.todayIso(), MONTHS);
    const values = months.flatMap((month) => [month.income, month.expenses]);
    // Si todavía no hay movimientos, se dibuja una línea plana en la base.
    const maxValue = Math.max(1, ...values);
    const step = months.length > 1 ? (PLOT_RIGHT - PLOT_LEFT) / (months.length - 1) : 0;

    const pointFor = (value: number, index: number): ChartPoint => ({
      x: PLOT_LEFT + index * step,
      y: PLOT_BOTTOM - (value / maxValue) * (PLOT_BOTTOM - PLOT_TOP),
    });

    const incomeDots = months.map((month, index) => pointFor(month.income, index));
    const expenseDots = months.map((month, index) => pointFor(month.expenses, index));
    const toPoints = (points: ChartPoint[]): string =>
      points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');

    const lastX = PLOT_LEFT + (months.length - 1) * step;

    return {
      months,
      incomePoints: toPoints(incomeDots),
      expensePoints: toPoints(expenseDots),
      areaPoints: toPoints([
        { x: PLOT_LEFT, y: PLOT_BOTTOM },
        ...incomeDots,
        { x: lastX, y: PLOT_BOTTOM },
      ]),
      hasData: values.some((value) => value > 0),
    };
  });
}
