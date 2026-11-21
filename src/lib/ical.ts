import { isISODate } from "./dates";
import { addLocalMinutes, isCalendarEvent, localDateTime, type CalendarEvent } from "./workspace";
const escapeText = (s: string) => s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
const unescapeText = (s: string) => s.replace(/\\([nN,;\\])/g, (_, c: string) => c.toLowerCase() === "n" ? "\n" : c);
const stamp = (s: string) => s.replace(/[-:]/g, "") + "00";
function fold(line: string) {
  const lines: string[] = []; let current = ""; let bytes = 0;
  for (const char of line) { const length = new TextEncoder().encode(char).length; if (bytes + length > 73) { lines.push(current); current = " "; bytes = 1; } current += char; bytes += length; }
  lines.push(current); return lines.join("\r\n");
}
/** RFC 5545 subset: local/UTC events, daily/weekly repeats and excluded dates. */
export function exportCalendar(events: readonly CalendarEvent[], now = new Date()): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Personal Learning OS//Calendar//RU", "CALSCALE:GREGORIAN"];
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${escapeText(e.id)}@personal-learning-os`, `DTSTAMP:${now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z/, "Z")}`, `DTSTART:${stamp(e.start)}`, `DTEND:${stamp(e.end)}`, `SUMMARY:${escapeText(e.title)}`, `DESCRIPTION:${escapeText(e.note)}`, `CATEGORIES:${e.category}`);
    if (e.repeat !== "none") lines.push(`RRULE:FREQ=${e.repeat.toUpperCase()}${e.until ? `;UNTIL=${e.until.replace(/-/g, "")}T235959` : ""}`);
    if (e.excludedDates?.length) lines.push(`EXDATE:${e.excludedDates.map((d) => stamp(`${d}T${e.start.slice(11)}`)).join(",")}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR"); return lines.map(fold).join("\r\n") + "\r\n";
}
function parseDate(key: string, value: string): string {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value);
  if (!m) throw new Error("Неизвестный формат даты");
  const local = `${m[1]}-${m[2]}-${m[3]}T${m[4] ?? "00"}:${m[5] ?? "00"}`;
  if (!isISODate(local.slice(0, 10))) throw new Error("Некорректная дата");
  if (m[7]) return localDateTime(new Date(`${local}:00Z`));
  const zone = /TZID=(?:"([^"]+)"|([^;]+))/.exec(key)?.slice(1).find(Boolean);
  if (!zone || zone === Intl.DateTimeFormat().resolvedOptions().timeZone) return local;
  const desired = Date.parse(`${local}:00Z`); let epoch = desired;
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  for (let i = 0; i < 3; i++) {
    const p = Object.fromEntries(fmt.formatToParts(new Date(epoch)).map((part) => [part.type, part.value]));
    const actual = Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`);
    const delta = desired - actual; epoch += delta; if (!delta) break;
  }
  return localDateTime(new Date(epoch));
}
export function importCalendar(text: string): { events: CalendarEvent[]; errors: string[] } {
  if (text.length > 2_000_000) throw new Error("Календарь слишком большой. Максимум 2 МБ.");
  if (!text.includes("BEGIN:VCALENDAR")) throw new Error("Это не файл iCalendar.");
  const chunks = text.replace(/\r?\n[ \t]/g, "").split("BEGIN:VEVENT").slice(1), events: CalendarEvent[] = [], errors: string[] = [];
  for (const [index, chunk] of chunks.entries()) {
    let title = `Событие ${index + 1}`;
    try {
      const props = chunk.split("END:VEVENT")[0].split(/\r?\n/).filter(Boolean).map((line) => { const colon = line.indexOf(":"); return [line.slice(0, colon), line.slice(colon + 1)] as const; });
      const get = (name: string) => props.find(([key]) => key.split(";")[0] === name);
      title = unescapeText(get("SUMMARY")?.[1] ?? title);
      const startProp = get("DTSTART"); if (!startProp) throw new Error("Не указано начало");
      const start = parseDate(...startProp), endProp = get("DTEND"), end = endProp ? parseDate(...endProp) : addLocalMinutes(start, startProp[0].includes("VALUE=DATE") ? 1440 : 60);
      const rule = get("RRULE")?.[1], freq = rule?.match(/(?:^|;)FREQ=(DAILY|WEEKLY)(?:;|$)/)?.[1];
      if (rule && (!freq || rule.split(";").some((part) => !/^(FREQ=(DAILY|WEEKLY)|INTERVAL=1|UNTIL=\d{8}(T\d{6}Z?)?)$/.test(part)))) throw new Error("Поддерживаются простые ежедневные/еженедельные повторы без COUNT и BYDAY");
      const zone = startProp[0].match(/TZID=([^;]+)/)?.[1];
      if (rule && (zone && zone !== Intl.DateTimeFormat().resolvedOptions().timeZone || /Z$/.test(startProp[1]))) throw new Error("Повторение в другой временной зоне требует отдельного импорта");
      const untilRaw = rule?.match(/UNTIL=(\d{4})(\d{2})(\d{2})/), until = untilRaw ? `${untilRaw[1]}-${untilRaw[2]}-${untilRaw[3]}` : undefined;
      const uid = unescapeText(get("UID")?.[1] ?? `${start}-${title}`).replace(/@personal-learning-os$/, "");
      const category = get("CATEGORIES")?.[1];
      const excludedDates = props.filter(([key]) => key.startsWith("EXDATE")).flatMap(([key, value]) => value.split(",").map((d) => parseDate(key, d).slice(0, 10)));
      const event: CalendarEvent = { id: uid, title, start, end, category: ["study", "personal", "work", "rest"].includes(category ?? "") ? category as CalendarEvent["category"] : "personal", note: unescapeText(get("DESCRIPTION")?.[1] ?? ""), repeat: freq ? freq.toLowerCase() as CalendarEvent["repeat"] : "none", ...(until ? { until } : {}), ...(excludedDates.length ? { excludedDates } : {}) };
      if (!isCalendarEvent(event)) throw new Error("Некорректные параметры события");
      if (!events.some((e) => e.id === event.id)) events.push(event);
    } catch (error) { errors.push(`${title}: ${error instanceof Error ? error.message : "не удалось прочитать"}`); }
  }
  return { events, errors };
}
export function csvCell(value: string | number) { const text = String(value); return `"${(/^[=+@\-\t\r]/.test(text) ? "'" + text : text).replace(/"/g, '""')}"`; }
