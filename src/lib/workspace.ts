import { isISODate, shiftISO } from "./dates";
import { isLocalDateTime, type BusyTime } from "./smart-planner";
export const WORKSPACE_KEY = "plos.workspace.v1";
export const CATEGORIES = { study: "Учёба", personal: "Личное", work: "Работа", rest: "Отдых" } as const;
export type CalendarEvent = { id: string; title: string; start: string; end: string; category: keyof typeof CATEGORIES; repeat: "none" | "daily" | "weekly"; until?: string; excludedDates?: string[]; note: string };
export type EventOccurrence = CalendarEvent & { occurrenceId: string; sourceId: string; occurrenceDate: string };
export type ReviewCard = { id: string; question: string; answer: string; subject: string; noteId?: string; due: string; level: number; reviews: number };
export type WorkspaceData = { version: 1; events: CalendarEvent[]; cards: ReviewCard[]; preferences: { startTime: string; endTime: string; weekdays: number[]; dailyMinutes: number; reminders: boolean } };
export const emptyWorkspace = (): WorkspaceData => ({ version: 1, events: [], cards: [], preferences: { startTime: "16:00", endTime: "21:00", weekdays: [1, 2, 3, 4, 5], dailyMinutes: 120, reminders: false } });
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";
const int = (n: unknown, min: number, max: number): n is number => typeof n === "number" && Number.isInteger(n) && n >= min && n <= max;
export function isCalendarEvent(v: unknown): v is CalendarEvent {
  return obj(v) && typeof v.id === "string" && v.id.length > 0 && typeof v.title === "string" && v.title.trim().length > 0 &&
    isLocalDateTime(v.start) && isLocalDateTime(v.end) && v.end > v.start && Date.parse(`${v.end}:00Z`) - Date.parse(`${v.start}:00Z`) <= 366 * 86400000 && typeof v.category === "string" && v.category in CATEGORIES &&
    ["none", "daily", "weekly"].includes(String(v.repeat)) && (v.until === undefined || isISODate(v.until)) &&
    (v.excludedDates === undefined || Array.isArray(v.excludedDates) && v.excludedDates.every(isISODate)) && typeof v.note === "string";
}
export function isWorkspace(v: unknown): v is WorkspaceData {
  if (!obj(v) || v.version !== 1 || !Array.isArray(v.events) || !v.events.every(isCalendarEvent) || !Array.isArray(v.cards) || !obj(v.preferences)) return false;
  const p = v.preferences;
  return v.cards.every((c) => obj(c) && typeof c.id === "string" && typeof c.question === "string" && typeof c.answer === "string" &&
    typeof c.subject === "string" && isISODate(c.due) && int(c.level, 0, 5) && int(c.reviews, 0, 1000000) && (c.noteId === undefined || typeof c.noteId === "string")) &&
    typeof p.startTime === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(p.startTime) && typeof p.endTime === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(p.endTime) &&
    Array.isArray(p.weekdays) && p.weekdays.every((d) => int(d, 1, 7)) && int(p.dailyMinutes, 15, 720) && typeof p.reminders === "boolean" &&
    new Set(v.events.map((e) => e.id)).size === v.events.length && new Set(v.cards.map((c) => c.id)).size === v.cards.length;
}
export function localDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function addLocalMinutes(value: string, minutes: number) {
  const date = new Date(`${value}:00Z`); date.setUTCMinutes(date.getUTCMinutes() + minutes); return date.toISOString().slice(0, 16);
}
/** Expands a bounded calendar range and includes ongoing overnight events. */
export function occurrences(events: readonly CalendarEvent[], from: string, to: string): EventOccurrence[] {
  if (!isISODate(from) || !isISODate(to) || from > to) return [];
  const output: EventOccurrence[] = [];
  for (const event of events) {
    if (!isCalendarEvent(event)) continue;
    const first = event.start.slice(0, 10), duration = (Date.parse(`${event.end}:00Z`) - Date.parse(`${event.start}:00Z`)) / 60000;
    let day = event.repeat === "none" ? first : shiftISO(from, -Math.ceil(duration / 1440));
    if (day < first) day = first;
    for (let count = 0; day <= to && count < 740; count++, day = shiftISO(day, 1)) {
      if (event.until && day > event.until) break;
      if (event.repeat === "none" && day !== first) break;
      const diff = (Date.parse(`${day}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / 86400000;
      if (event.repeat === "weekly" && diff % 7 !== 0 || event.excludedDates?.includes(day)) continue;
      const start = `${day}T${event.start.slice(11)}`, end = addLocalMinutes(start, duration);
      if (end > `${from}T00:00` && start < `${shiftISO(to, 1)}T00:00`) output.push({ ...event, start, end, occurrenceId: `${event.id}@${day}`, sourceId: event.id, occurrenceDate: day });
      if (event.repeat === "none") break;
    }
  }
  return output.sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
}
export function eventBusyTimes(events: readonly CalendarEvent[], date: string): BusyTime[] {
  return occurrences(events, date, shiftISO(date, 1)).map((e) => ({ id: e.occurrenceId, title: e.title, start: e.start, end: e.end }));
}
export function conflicts(event: Pick<CalendarEvent, "start" | "end">, others: readonly Pick<CalendarEvent, "start" | "end">[]) {
  return others.filter((e) => event.start < e.end && event.end > e.start);
}
export function reviewCard(card: ReviewCard, remembered: boolean, today: string): ReviewCard {
  const level = remembered ? Math.min(5, card.level + 1) : 0;
  return { ...card, level, due: shiftISO(today, [1, 1, 3, 7, 14, 30][level]), reviews: card.reviews + 1 };
}
export async function downloadText(name: string, content: string, type = "text/plain;charset=utf-8") {
  const { Capacitor } = await import('@capacitor/core');
  if (Capacitor.isNativePlatform()) {
    try {
      const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')]);
      const path = `exports/${name.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
      const { uri } = await Filesystem.writeFile({ path, data: content, directory: Directory.Cache, encoding: Encoding.UTF8, recursive: true });
      await Share.share({ title: name, files: [uri], dialogTitle: 'Сохранить или отправить файл' });
    } catch (error) { window.alert(`Не удалось отправить файл: ${error instanceof Error ? error.message : String(error)}`); }
    return;
  }
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
