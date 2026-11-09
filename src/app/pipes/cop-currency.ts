import { Pipe, PipeTransform } from '@angular/core';
import { formatCurrency } from '../utils/format';

/** Moneda de la app (peso colombiano) con el mismo formato en toda la interfaz. */
@Pipe({ name: 'cop' })
export class CopCurrencyPipe implements PipeTransform {
  transform(value: number): string {
    return formatCurrency(value);
  }
}
