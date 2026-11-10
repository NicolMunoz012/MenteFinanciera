import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CopCurrencyPipe } from '../../pipes/cop-currency';
import { percentOf } from '../../utils/format';

const MAX_INITIALS = 2;

@Component({
  selector: 'app-progress-card',
  imports: [CommonModule, CopCurrencyPipe],
  templateUrl: './progress-card.html',
  styleUrl: './progress-card.scss',
})
export class ProgressCard {
  @Input() title = '';
  @Input() current = 0;
  @Input() target = 0;
  @Input() note = '';
  @Output() removed = new EventEmitter<void>();

  get initials(): string {
    return this.title.slice(0, MAX_INITIALS).toUpperCase();
  }

  get percent(): number {
    return percentOf(this.current, this.target);
  }

  get over(): boolean {
    return this.current > this.target;
  }
}
