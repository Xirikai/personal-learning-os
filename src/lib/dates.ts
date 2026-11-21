export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function formatDue(iso: string, today: string): { label: string; overdue: boolean } {
  if (iso === today) return { label: "Сегодня", overdue: false };
  if (iso < today) return { label: `Просрочено · ${shortDate(iso)}`, overdue: true };
  return { label: shortDate(iso), overdue: false };
}

export function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;

/** Разбирает YYYY-MM-DD как ЛОКАЛЬНУЮ полночь (без сдвига на соседний день из-за UTC). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** true, только если строка — существующая календарная дата в формате YYYY-MM-DD. */
export function isISODate(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  return toISODate(parseISODate(v)) === v;
}

/** Сдвиг даты на n дней (устойчив к переходу на летнее время). */
export function shiftISO(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Понедельник недели, в которую попадает дата. */
export function weekStartISO(iso: string): string {
  const d = parseISODate(iso);
  return shiftISO(iso, -((d.getDay() + 6) % 7));
}

/** Семь дат недели (Пн–Вс), в которую попадает дата. */
export function weekDatesISO(iso: string): string[] {
  const start = weekStartISO(iso);
  return Array.from({ length: 7 }, (_, i) => shiftISO(start, i));
}

export type CalendarCell = { iso: string; day: number; inMonth: boolean };

/** Сетка месяца полными неделями (Пн–Вс). month: 0–11. */
export function monthCells(year: number, month: number): CalendarCell[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const total = Math.ceil((offset + new Date(year, month + 1, 0).getDate()) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(year, month, 1 - offset + i);
    return { iso: toISODate(d), day: d.getDate(), inMonth: d.getMonth() === month };
  });
}

export function formatLongDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

export function formatShortDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function formatWeekRange(weekStart: string): string {
  return `${formatShortDate(weekStart)} – ${formatShortDate(shiftISO(weekStart, 6))}`;
}
