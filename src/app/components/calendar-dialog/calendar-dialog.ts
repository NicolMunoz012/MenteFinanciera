import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { Transaction } from '../../models/transaction.model';
import { MonthCalendar } from '../month-calendar/month-calendar';

/**
 * Ventana emergente con el calendario mensual. Se controla con `open` y avisa
 * cuando se elige una fecha o cuando el usuario la cierra.
 */
@Component({
  selector: 'app-calendar-dialog',
  imports: [CommonModule, MonthCalendar],
  templateUrl: './calendar-dialog.html',
  styleUrl: './calendar-dialog.scss',
})
export class CalendarDialog implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() selectedDate = '';
  @Input() transactions: Transaction[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() dateSelected = new EventEmitter<string>();

  ngOnChanges(changes: SimpleChanges): void {
    const openChange = changes['open'];
    if (!openChange) {
      return;
    }
    this.setBodyScrollLocked(openChange.currentValue === true);
  }

  ngOnDestroy(): void {
    this.setBodyScrollLocked(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.close();
    }
  }

  close(): void {
    this.closed.emit();
  }

  choose(date: string): void {
    this.dateSelected.emit(date);
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  private setBodyScrollLocked(locked: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.body.style.overflow = locked ? 'hidden' : '';
  }
}
