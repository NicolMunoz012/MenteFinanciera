import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ChartItem } from '../../models/chart.model';
import { CopCurrencyPipe } from '../../pipes/cop-currency';

const RING_RADIUS = 51;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface DonutSegment {
  color: string;
  dashArray: string;
  dashOffset: number;
}

@Component({
  selector: 'app-expense-donut-card',
  imports: [CommonModule, CopCurrencyPipe],
  templateUrl: './expense-donut-card.html',
  styleUrl: './expense-donut-card.scss',
})
export class ExpenseDonutCard {
  @Input() items: ChartItem[] = [];
  @Input() total = 0;

  readonly radius = RING_RADIUS;

  get segments(): DonutSegment[] {
    let consumedLength = 0;

    return this.items.map((item) => {
      const length = (item.percent / 100) * RING_CIRCUMFERENCE;
      const segment = {
        color: item.color,
        dashArray: `${length} ${RING_CIRCUMFERENCE - length}`,
        dashOffset: -consumedLength,
      };
      consumedLength += length;
      return segment;
    });
  }
}
