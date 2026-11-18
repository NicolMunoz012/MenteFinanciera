export const REMINDER_WARNING_DAYS = 3;

export function describeDueDate(daysLeft: number): string {
  const days = Math.abs(daysLeft);
  const dayWord = days === 1 ? 'día' : 'días';
  if (daysLeft < 0) {
    return `venció hace ${days} ${dayWord}`;
  }
  return daysLeft === 0 ? 'vence hoy' : `vence en ${days} ${dayWord}`;
}
