import { Pipe, PipeTransform } from '@angular/core';
import { parseISODate } from '../utils/dates';

type DateStyle = 'short' | 'long';

const DATE_FORMATS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short: { day: 'numeric', month: 'short', year: 'numeric' },
  long: { weekday: 'long', day: 'numeric', month: 'long' },
};

@Pipe({ name: 'spanishDate' })
export class SpanishDatePipe implements PipeTransform {
  transform(isoDate: string, style: DateStyle = 'short'): string {
    const text = new Intl.DateTimeFormat('es', DATE_FORMATS[style]).format(parseISODate(isoDate));
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}
