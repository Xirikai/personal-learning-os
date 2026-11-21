import { isISODate, shiftISO } from "./dates";
import type { Task } from "./types";

export type Language = "ru" | "en";
export type Fatigue = "low" | "medium" | "high";
export type BusyTime = { id: string; title: string; start: string; end: string };
export type PlanSettings = {
  date: string; startTime: string; endTime: string; fatigue: Fatigue; breakMinutes: number;
  mode: "plan" | "replan"; currentTime: string; delayMinutes: number; unavailable: BusyTime[];
};
export type PlanBlock = {
  id: string; kind: "study" | "fixed" | "break" | "unavailable" | "free";
  start: string; end: string; taskId?: string; label?: string;
};
export type Reason = "insufficient-time" | "fatigue" | "fixed-outside" | "fixed-conflict" | "invalid-task";
export type UnscheduledTask = { taskId: string; remainingMinutes: number; reason: Reason; suggestedDate: string };
export type PlanWarning = { code: "overdue" | "invalid-input" | "fixed-conflict" | "no-time" | "no-tasks" | "all-done" | "fatigue"; taskId?: string };
export type PlanResult = { blocks: PlanBlock[]; unscheduled: UnscheduledTask[]; warnings: PlanWarning[]; canApply: boolean; studyMinutes: number };
export type SavedPlan = { settings: PlanSettings; result: PlanResult; taskIds: string[]; updatedAt: string };
export type PlannerData = { version: 1; days: Record<string, SavedPlan> };
export const emptyPlanner = (): PlannerData => ({ version: 1, days: {} });

export function timeMinutes(time: string): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return NaN;
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
}
export function isLocalDateTime(value: unknown): value is string {
  return typeof value === "string" && value.length === 16 && value[10] === "T" &&
    isISODate(value.slice(0, 10)) && Number.isFinite(timeMinutes(value.slice(11)));
}
function offset(date: string, datetime: string): number {
  if (!isLocalDateTime(datetime)) return NaN;
  return (Date.parse(`${datetime.slice(0, 10)}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86400000 * 1440 + timeMinutes(datetime.slice(11));
}
function datetime(date: string, minute: number): string {
  const day = Math.floor(minute / 1440);
  const clock = minute - day * 1440;
  return `${shiftISO(date, day)}T${String(Math.floor(clock / 60)).padStart(2, "0")}:${String(clock % 60).padStart(2, "0")}`;
}
const int = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";
export function isPlanSettings(v: unknown): v is PlanSettings {
  return obj(v) && isISODate(v.date) && typeof v.startTime === "string" && Number.isFinite(timeMinutes(v.startTime)) &&
    typeof v.endTime === "string" && Number.isFinite(timeMinutes(v.endTime)) &&
    ["low", "medium", "high"].includes(String(v.fatigue)) && int(v.breakMinutes, 0, 120) &&
    (v.mode === "plan" || v.mode === "replan") && typeof v.currentTime === "string" &&
    (v.mode !== "replan" || isLocalDateTime(v.currentTime)) && int(v.delayMinutes, 0, 1440) &&
    Array.isArray(v.unavailable) && v.unavailable.every((b) => obj(b) && typeof b.id === "string" &&
      typeof b.title === "string" && isLocalDateTime(b.start) && isLocalDateTime(b.end) && b.end > b.start);
}
export function isPlanResult(v: unknown): v is PlanResult {
  if (!obj(v) || typeof v.canApply !== "boolean" || !int(v.studyMinutes, 0, 2880) || !Array.isArray(v.blocks) ||
    !Array.isArray(v.unscheduled) || !Array.isArray(v.warnings)) return false;
  const blocks = v.blocks;
  return blocks.every((b, index) => obj(b) && typeof b.id === "string" && ["study", "fixed", "break", "unavailable", "free"].includes(String(b.kind)) &&
    isLocalDateTime(b.start) && isLocalDateTime(b.end) && b.end > b.start && (b.taskId === undefined || typeof b.taskId === "string") &&
    (b.label === undefined || typeof b.label === "string") && (index === 0 || b.start >= blocks[index - 1].end)) &&
    v.unscheduled.every((u) => obj(u) && typeof u.taskId === "string" && int(u.remainingMinutes, 1, 1440) &&
      ["insufficient-time", "fatigue", "fixed-outside", "fixed-conflict", "invalid-task"].includes(String(u.reason)) && isISODate(u.suggestedDate)) &&
    v.warnings.every((w) => obj(w) && ["overdue", "invalid-input", "fixed-conflict", "no-time", "no-tasks", "all-done", "fatigue"].includes(String(w.code)) &&
      (w.taskId === undefined || typeof w.taskId === "string"));
}
export function isPlannerData(v: unknown): v is PlannerData {
  return obj(v) && v.version === 1 && obj(v.days) && Object.entries(v.days).every(([date, p]) =>
    isISODate(date) && obj(p) && isPlanSettings(p.settings) && p.settings.date === date && isPlanResult(p.result) &&
    Array.isArray(p.taskIds) && p.taskIds.every((id) => typeof id === "string") && typeof p.updatedAt === "string");
}
export function taskDefaults(task: Task): Required<Pick<Task, "durationMinutes" | "priority" | "mandatory" | "splittable">> {
  return { durationMinutes: task.durationMinutes ?? 30, priority: task.priority ?? "medium", mandatory: task.mandatory ?? false, splittable: task.splittable ?? true };
}

/** Deterministic greedy scheduler. Calendar minutes avoid UTC/DST shifts and support midnight.
 * Fixed commitments are reserved first. Mandatory tasks sort by deadline, then priority;
 * other tasks by priority, deadline, duration, creation time and ID. No input is mutated.
 * A partial block never implies completion; the remaining duration stays visible.
 */
export function createPlan(tasks: readonly Task[], settings: PlanSettings, commitments: readonly BusyTime[] = []): PlanResult {
  const result: PlanResult = { blocks: [], unscheduled: [], warnings: [], canApply: true, studyMinutes: 0 };
  if (!isPlanSettings(settings) || !isPlanSettings({ ...settings, unavailable: [...settings.unavailable, ...commitments] }) || settings.startTime === settings.endTime) {
    return { ...result, canApply: false, warnings: [{ code: "invalid-input" }] };
  }
  const date = settings.date;
  const windowStart = timeMinutes(settings.startTime);
  const windowEnd = timeMinutes(settings.endTime) + (timeMinutes(settings.endTime) < windowStart ? 1440 : 0);
  const start = settings.mode === "replan" ? Math.max(windowStart, offset(date, settings.currentTime) + settings.delayMinutes) : windowStart;
  const rest = Math.max(settings.breakMinutes, settings.fatigue === "high" ? 15 : settings.fatigue === "medium" ? 10 : 0);
  const maxBlock = settings.fatigue === "high" ? 20 : settings.fatigue === "medium" ? 30 : 60;
  const budget = settings.fatigue === "high" ? 60 : 1440;
  type Interval = { start: number; end: number; kind: PlanBlock["kind"]; taskId?: string; label?: string };
  const occupied: Interval[] = [];
  const pending = tasks.filter((t) => !t.done);
  if (!tasks.length) result.warnings.push({ code: "no-tasks" });
  else if (!pending.length) result.warnings.push({ code: "all-done" });
  if (start >= windowEnd) result.warnings.push({ code: "no-time" });
  if (settings.fatigue !== "low") result.warnings.push({ code: "fatigue" });
  const fail = (t: Task, remainingMinutes: number, reason: Reason) => result.unscheduled.push({ taskId: t.id, remainingMinutes, reason, suggestedDate: shiftISO(date, 1) });
  for (const b of [...settings.unavailable, ...commitments]) {
    const s = Math.max(start, offset(date, b.start)), e = Math.min(windowEnd, offset(date, b.end));
    if (e > s) occupied.push({ start: s, end: e, kind: "unavailable", label: b.title });
  }
  // Merge busy intervals so duplicated/overlapping personal commitments never overlap in the output.
  occupied.sort((a, b) => a.start - b.start || a.end - b.end);
  for (let i = 1; i < occupied.length;) {
    if (occupied[i].start <= occupied[i - 1].end) {
      occupied[i - 1].end = Math.max(occupied[i - 1].end, occupied[i].end);
      occupied[i - 1].label = [occupied[i - 1].label, occupied[i].label].filter(Boolean).join(" · ");
      occupied.splice(i, 1);
    } else i++;
  }
  const seen = new Set<string>();
  const valid = tasks.filter((t) => {
    const p = taskDefaults(t);
    if (!t.id || seen.has(t.id) || !t.title.trim() || !isISODate(t.due) || !int(p.durationMinutes, 1, 1440) ||
      !["high", "medium", "low"].includes(p.priority) || typeof p.mandatory !== "boolean" || typeof p.splittable !== "boolean" ||
      (t.fixedStart !== undefined && t.fixedStart !== "" && !isLocalDateTime(t.fixedStart))) {
      fail(t, int(p.durationMinutes, 1, 1440) ? p.durationMinutes : 30, "invalid-task");
      result.canApply = false;
      return false;
    }
    seen.add(t.id);
    if (!t.done && t.due < date) result.warnings.push({ code: "overdue", taskId: t.id });
    return true;
  });
  const compareText = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
  const fixed = valid.filter((t) => !t.done && t.fixedStart).sort((a, b) => compareText(a.fixedStart!, b.fixedStart!) || compareText(a.id, b.id));
  for (const t of fixed) {
    const originalStart = offset(date, t.fixedStart!), originalEnd = originalStart + taskDefaults(t).durationMinutes;
    // An event already in progress still blocks its remaining time. Its actual start is never changed on the task.
    const s = Math.max(start, originalStart), e = Math.min(windowEnd, originalEnd);
    if (e <= s) { fail(t, taskDefaults(t).durationMinutes, "fixed-outside"); continue; }
    if (originalEnd > windowEnd) fail(t, originalEnd - windowEnd, "fixed-outside");
    if (occupied.some((o) => s < o.end && e > o.start)) {
      fail(t, taskDefaults(t).durationMinutes, "fixed-conflict");
      result.warnings.push({ code: "fixed-conflict", taskId: t.id });
      result.canApply = false;
      continue;
    }
    occupied.push({ start: s, end: e, kind: "fixed", taskId: t.id });
    result.studyMinutes += e - s;
  }
  function gaps(): Array<{ start: number; end: number }> {
    const sorted = [...occupied].sort((a, b) => a.start - b.start || a.end - b.end);
    const free: Array<{ start: number; end: number }> = [];
    let cursor = start;
    for (const o of sorted) {
      if (o.start > cursor) free.push({ start: cursor, end: o.start });
      cursor = Math.max(cursor, o.end);
    }
    if (cursor < windowEnd) free.push({ start: cursor, end: windowEnd });
    return free;
  }
  // Reserve recovery after fixed events without moving the events themselves.
  for (const o of [...occupied].filter((b) => b.kind === "fixed")) {
    const gap = gaps().find((g) => g.start === o.end);
    if (gap && rest) occupied.push({ start: gap.start, end: Math.min(gap.end, gap.start + rest), kind: "break" });
  }
  const rank = { high: 0, medium: 1, low: 2 };
  const flexible = valid.filter((t) => !t.done && !t.fixedStart).sort((a, b) => {
    const x = taskDefaults(a), y = taskDefaults(b);
    return Number(y.mandatory) - Number(x.mandatory) ||
      (x.mandatory && y.mandatory ? compareText(a.due, b.due) : 0) || rank[x.priority] - rank[y.priority] ||
      compareText(a.due, b.due) || x.durationMinutes - y.durationMinutes || a.createdAt - b.createdAt || compareText(a.id, b.id);
  });
  for (const task of flexible) {
    const p = taskDefaults(task);
    let remaining = p.durationMinutes;
    if (settings.fatigue === "high" && !p.mandatory && p.priority !== "high") { fail(task, remaining, "fatigue"); continue; }
    if (!p.splittable && (remaining > maxBlock && settings.fatigue !== "low" || remaining > budget - result.studyMinutes)) {
      fail(task, remaining, "fatigue"); continue;
    }
    while (remaining > 0 && result.studyMinutes < budget) {
      let placed = false;
      for (const gap of gaps()) {
        // Recovery must fit before the next fixed/personal commitment; the day's end needs no extra padding.
        const available = gap.end - gap.start - (gap.end < windowEnd ? rest : 0);
        const duration = p.splittable ? Math.min(remaining, maxBlock, available, budget - result.studyMinutes) : remaining;
        if (duration <= 0 || duration > available || (!p.splittable && duration > budget - result.studyMinutes) ||
          (p.splittable && duration < Math.min(5, remaining))) continue;
        const end = gap.start + duration;
        occupied.push({ start: gap.start, end, kind: "study", taskId: task.id });
        if (rest && end < gap.end) occupied.push({ start: end, end: Math.min(gap.end, end + rest), kind: "break" });
        remaining -= duration;
        result.studyMinutes += duration;
        placed = true;
        break;
      }
      if (!placed) break;
    }
    if (remaining) fail(task, remaining, result.studyMinutes >= budget ? "fatigue" : "insufficient-time");
  }
  occupied.push(...gaps().map((g) => ({ ...g, kind: "free" as const })));
  result.blocks = occupied.sort((a, b) => a.start - b.start || a.end - b.end).map((b, i) => ({
    id: `${date}-${i}-${b.kind}-${b.taskId ?? ""}`, kind: b.kind,
    start: datetime(date, b.start), end: datetime(date, b.end), ...(b.taskId ? { taskId: b.taskId } : {}), ...(b.label ? { label: b.label } : {}),
  }));
  return result;
}
