import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyWorkspace, isWorkspace, occurrences, reviewCard, localDateTime, conflicts, type CalendarEvent, type ReviewCard } from "../src/lib/workspace";
import { importCalendar, exportCalendar, csvCell } from "../src/lib/ical";
import { createWeekPlan } from "../src/lib/week-planner";
import { createPlan, emptyPlanner, isPlannerData } from "../src/lib/smart-planner";
import { createBackup, restoreBackup, isAppBackup } from "../src/lib/backup";
import type { Task } from "../src/lib/types";
const event: CalendarEvent = { id: "event", title: "English", start: "2026-11-23T17:00", end: "2026-11-23T18:00", repeat: "weekly", category: "study", note: "" };
const task = (id: string, minutes: number): Task => ({ id, title: id, due: "2026-11-29", done: false, subject: "", createdAt: 1, durationMinutes: minutes, splittable: true, priority: "high" });
const now = "2026-11-23T10:00";
test("workspace validation accepts defaults and rejects invalid preferences and duplicate IDs", () => {
  const ws = emptyWorkspace(); assert.ok(isWorkspace(ws)); ws.preferences.dailyMinutes = NaN; assert.equal(isWorkspace(ws), false);
  const valid = emptyWorkspace(); valid.events = [event, event]; assert.equal(isWorkspace(valid), false);
});
test("weekly events expand without altering the series and respect until/exclusions", () => {
  const before = JSON.stringify(event);
  const found = occurrences([{ ...event, until: "2026-12-07", excludedDates: ["2026-11-30"] }], "2026-11-23", "2026-12-14");
  assert.deepEqual(found.map((e) => e.occurrenceDate), ["2026-11-23", "2026-12-07"]); assert.equal(JSON.stringify(event), before);
});
test("daily overnight events include the part that began the previous day", () => {
  const found = occurrences([{ ...event, start: "2026-11-23T23:00", end: "2026-11-24T02:00", repeat: "daily" }], "2026-11-24", "2026-11-24");
  assert.equal(found.length, 2); assert.equal(found[0].end, "2026-11-24T02:00");
});
test("event overlaps use half-open intervals", () => {
  assert.equal(conflicts(event, [{ start: "2026-11-23T18:00", end: "2026-11-23T19:00" }]).length, 0);
  assert.equal(conflicts(event, [{ start: "2026-11-23T17:30", end: "2026-11-23T19:00" }]).length, 1);
});
test("review intervals increase after successful recall and reset after a miss", () => {
  let card: ReviewCard = { id: "c", question: "q", answer: "a", subject: "", due: "2026-11-23", level: 0, reviews: 0 };
  card = reviewCard(card, true, "2026-11-23"); assert.equal(card.due, "2026-11-24");
  card = reviewCard(card, true, "2026-11-24"); assert.equal(card.due, "2026-11-27");
  card = reviewCard(card, false, "2026-11-27"); assert.equal(card.level, 0); assert.equal(card.due, "2026-11-28"); assert.equal(card.reviews, 3);
});
test("weekly work is allocated once and every remaining minute is visible", () => {
  const tasks = [task("a", 400), task("b", 300)]; const ws = emptyWorkspace();
  ws.preferences.dailyMinutes = 90; ws.events = [event]; const before = JSON.stringify(tasks);
  const plan = createWeekPlan(tasks, ws, "2026-11-23", "low", now);
  assert.equal(plan.days.length, 5);
  const placed = plan.days.reduce((sum, d) => sum + d.result.studyMinutes, 0);
  assert.equal(placed + plan.remaining.reduce((sum, t) => sum + t.minutes, 0), 700);
  assert.ok(plan.days.every((d) => d.result.studyMinutes <= 90)); assert.equal(JSON.stringify(tasks), before);
  for (const day of plan.days) for (let i = 1; i < day.result.blocks.length; i++) assert.ok(day.result.blocks[i].start >= day.result.blocks[i - 1].end);
});
test("weekly calendar reservations prevent study from crossing personal events", () => {
  const ws = emptyWorkspace(); ws.events = [event]; const plan = createWeekPlan([task("a", 300)], ws, "2026-11-23", "low", now);
  const first = plan.days[0]; assert.ok(first.result.blocks.some((b) => b.kind === "unavailable" && b.start === event.start));
});
test("a week in the past produces no new plans", () => {
  assert.equal(createWeekPlan([task("a", 60)], emptyWorkspace(), "2026-11-01", "low", now).days.length, 0);
});
test("weekly planning preserves the earlier part of the current day", () => {
  const tasks = [task("a", 60)]; const settings = { date: "2026-11-23", startTime: "08:00", endTime: "09:00", fatigue: "low" as const, breakMinutes: 0, mode: "plan" as const, currentTime: now, delayMinutes: 0, unavailable: [] };
  const planner = emptyPlanner(); planner.days[settings.date] = { settings, result: createPlan(tasks, settings), taskIds: ["a"], updatedAt: now };
  const plan = createWeekPlan(tasks, emptyWorkspace(), "2026-11-23", "low", now, planner);
  assert.ok(plan.days[0].result.blocks.some((b) => b.start === "2026-11-23T08:00"));
  const next = { version: 1 as const, days: Object.fromEntries(plan.days.map((d) => [d.settings.date, d])) }; assert.ok(isPlannerData(next));
});
test("calendar export/import retains unicode, escapes, repetitions and stable IDs", () => {
  const value = { ...event, title: "Английский, повторение; " + "длинное название ".repeat(10), note: "Строка 1\nСтрока 2 \\ **тест**", excludedDates: ["2026-11-30"], until: "2026-12-31" };
  const text = exportCalendar([value], new Date("2026-11-19T12:00:00Z"));
  const parsed = importCalendar(text); assert.deepEqual(parsed.errors, []); assert.deepEqual(parsed.events[0], value);
  for (const line of text.split("\r\n")) assert.ok(new TextEncoder().encode(line).length <= 75);
});
test("UTC single events convert into the device's local calendar time", () => {
  const parsed = importCalendar("BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:a\nDTSTART:20261123T170000Z\nDTEND:20261123T180000Z\nSUMMARY:Test\nEND:VEVENT\nEND:VCALENDAR");
  assert.equal(parsed.events[0].start, localDateTime(new Date("2026-11-23T17:00:00Z")));
});
test("unsupported recurrence produces an explicit error instead of changed events", () => {
  const parsed = importCalendar("BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:20261123T170000\nDTEND:20261123T180000\nRRULE:FREQ=MONTHLY\nSUMMARY:Test\nEND:VEVENT\nEND:VCALENDAR");
  assert.equal(parsed.events.length, 0); assert.equal(parsed.errors.length, 1);
});
test("duplicate imported event IDs are not duplicated", () => {
  const text = exportCalendar([event, event]); assert.equal(importCalendar(text).events.length, 1);
});
test("CSV cells escape quotes and prevent spreadsheet formula injection", () => {
  assert.equal(csvCell('a"b'), '"a""b"'); assert.equal(csvCell("=1+2"), '"\'=1+2"');
});
test("backup and restore retain calendar events and review cards", () => {
  const values = new Map<string, string>(); const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
  const ws = emptyWorkspace(); ws.events = [event]; storage.setItem("plos.workspace.v1", JSON.stringify(ws));
  const backup = createBackup(); assert.ok(isAppBackup(backup)); restoreBackup(backup); assert.deepEqual(JSON.parse(storage.getItem("plos.workspace.v1")!), ws);
  const old = { ...backup, data: { ...backup.data } }; delete old.data.workspace; assert.ok(isAppBackup(old));
});
