const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;

export function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function today(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const difference = parseISODate(toIso).getTime() - parseISODate(fromIso).getTime();
  return Math.round(difference / MS_PER_DAY);
}

export function startOfWeek(iso: string): string {
  const daysSinceMonday = (parseISODate(iso).getDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK;
  return addDays(iso, -daysSinceMonday);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function previousMonthKey(iso: string): string {
  return monthKey(addDays(`${monthKey(iso)}-01`, -1));
}

/** Desplaza una fecha por meses conservando el mes (YYYY-MM). */
export function shiftMonthKey(iso: string, months: number): string {
  const date = parseISODate(`${monthKey(iso)}-01`);
  date.setMonth(date.getMonth() + months);
  return monthKey(toISODate(date));
}

export function lastDayOfPreviousMonth(iso: string): string {
  return addDays(`${monthKey(iso)}-01`, -1);
}

/** Último día del mes de la fecha indicada (YYYY-MM-DD). */
export function lastDayOfMonth(iso: string): string {
  return addDays(`${shiftMonthKey(iso, 1)}-01`, -1);
}

/**
 * Desplaza la fecha por meses conservando el día, ajustándolo al último día
 * disponible (31 de enero + 1 mes = 28 o 29 de febrero).
 */
export function shiftMonthKeepingDay(iso: string, months: number): string {
  const targetMonth = shiftMonthKey(iso, months);
  const desiredDay = Number(iso.slice(8, 10));
  const lastDay = Number(lastDayOfMonth(`${targetMonth}-01`).slice(8, 10));
  const day = String(Math.min(desiredDay, lastDay)).padStart(2, '0');
  return `${targetMonth}-${day}`;
}
