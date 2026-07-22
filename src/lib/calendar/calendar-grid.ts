/**
 * Utilitarios puros para montar a grade do calendario mensal (secao 17).
 * Trabalha em UTC para evitar deslocamento de fuso horario entre o
 * servidor e o navegador.
 */
export function computeMonthGridDays(year: number, month: number): Date[] {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const firstWeekday = firstOfMonth.getUTCDay(); // 0 = domingo

  const gridStart = new Date(firstOfMonth);
  gridStart.setUTCDate(gridStart.getUTCDate() - firstWeekday);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const day = new Date(gridStart);
    day.setUTCDate(gridStart.getUTCDate() + i);
    days.push(day);
  }
  return days;
}

export function isSameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export function isSameUtcMonth(a: Date, month: number, year: number): boolean {
  return a.getUTCMonth() === month && a.getUTCFullYear() === year;
}

export function computeWeekDays(referenceDate: Date): Date[] {
  const weekday = referenceDate.getUTCDay();
  const start = new Date(referenceDate);
  start.setUTCDate(start.getUTCDate() - weekday);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + i);
    days.push(day);
  }
  return days;
}
