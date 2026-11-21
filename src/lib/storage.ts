import { isISODate } from "./dates";
import type { Habit, Note, StudySession, Task, TimerSettings, TimerState, WeeklyGoal } from "./types";

export const TASKS_KEY = "plos.tasks.v1";
export const NOTES_KEY = "plos.notes.v1";
export const THEME_KEY = "plos.theme";
export const SESSIONS_KEY = "plos.sessions.v1";
export const HABITS_KEY = "plos.habits.v1";
export const GOALS_KEY = "plos.goals.v1";
export const TIMER_SETTINGS_KEY = "plos.timer.settings.v1";
export const TIMER_STATE_KEY = "plos.timer.state.v1";

export type LoadResult<T> =
  | { status: "empty" }
  | { status: "ok"; value: T }
  | { status: "error" };

export function load<T>(key: string, guard: (v: unknown) => v is T): LoadResult<T> {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return { status: "empty" };
    const parsed: unknown = JSON.parse(raw);
    if (!guard(parsed)) {
      backupCorrupt(key, raw);
      return { status: "error" };
    }
    return { status: "ok", value: parsed };
  } catch {
    backupCorrupt(key);
    return { status: "error" };
  }
}

/** Копирует нечитаемое значение в `<key>.corrupt`, чтобы его можно было восстановить вручную. */
function backupCorrupt(key: string, raw?: string | null) {
  try {
    const value = raw ?? localStorage.getItem(key);
    if (value !== null) localStorage.setItem(`${key}.corrupt`, value);
  } catch {
    /* резервная копия — best effort */
  }
}

export type LoadListResult<T> =
  | { status: "empty" }
  | { status: "ok"; value: T[]; dropped: number }
  | { status: "error" };

/** Читает массив, пропуская некорректные элементы (а не отбрасывая весь список). */
export function loadList<T>(key: string, itemGuard: (v: unknown) => v is T): LoadListResult<T> {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return { status: "empty" };
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      backupCorrupt(key, raw);
      return { status: "error" };
    }
    const value = parsed.filter(itemGuard);
    if (value.length !== parsed.length) backupCorrupt(key, raw);
    return { status: "ok", value, dropped: parsed.length - value.length };
  } catch {
    backupCorrupt(key);
    return { status: "error" };
  }
}

export function save(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

export function isTaskArray(v: unknown): v is Task[] {
  return (
    Array.isArray(v) &&
    v.every(
      (t) =>
        isObj(t) &&
        typeof t.id === "string" &&
        typeof t.title === "string" &&
        typeof t.subject === "string" &&
        typeof t.due === "string" &&
        typeof t.done === "boolean" &&
        typeof t.createdAt === "number" &&
        (t.steps === undefined || Array.isArray(t.steps) && t.steps.every((s: unknown) => isObj(s) && typeof s.id === "string" && typeof s.title === "string" && typeof s.done === "boolean")),
    )
  );
}

export function isNoteArray(v: unknown): v is Note[] {
  return (
    Array.isArray(v) &&
    v.every(
      (n) =>
        isObj(n) &&
        typeof n.id === "string" &&
        typeof n.title === "string" &&
        typeof n.content === "string" &&
        Array.isArray(n.tags) &&
        n.tags.every((t: unknown) => typeof t === "string") &&
        typeof n.createdAt === "number" && (n.pinned === undefined || typeof n.pinned === "boolean") && (n.taskId === undefined || typeof n.taskId === "string"),
    )
  );
}

const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isIntIn = (v: unknown, min: number, max: number): v is number =>
  isNum(v) && Number.isInteger(v) && v >= min && v <= max;
const isNullableStr = (v: unknown): v is string | null => v === null || isStr(v);

export function isSession(v: unknown): v is StudySession {
  return (
    isObj(v) &&
    isStr(v.id) &&
    isISODate(v.date) &&
    isIntIn(v.minutes, 1, 1440) &&
    isStr(v.subject) &&
    isStr(v.note) &&
    isNullableStr(v.taskId) &&
    (v.source === "manual" || v.source === "pomodoro") &&
    isNum(v.createdAt)
  );
}

export function isHabit(v: unknown): v is Habit {
  return (
    isObj(v) &&
    isStr(v.id) &&
    isStr(v.name) &&
    isIntIn(v.target, 1, 7) &&
    Array.isArray(v.checks) &&
    v.checks.every((c: unknown) => isISODate(c)) &&
    isNum(v.createdAt)
  );
}

export function isGoal(v: unknown): v is WeeklyGoal {
  return (
    isObj(v) &&
    isStr(v.id) &&
    isStr(v.title) &&
    (v.kind === "minutes" || v.kind === "sessions" || v.kind === "manual") &&
    isIntIn(v.target, 1, 100000) &&
    isISODate(v.weekStart) &&
    isStr(v.subject) &&
    isIntIn(v.progress, 0, 100000) &&
    isNum(v.createdAt)
  );
}

export function isTimerSettings(v: unknown): v is TimerSettings {
  return (
    isObj(v) &&
    isIntIn(v.focusMin, 1, 180) &&
    isIntIn(v.shortMin, 1, 60) &&
    isIntIn(v.longMin, 1, 120) &&
    isIntIn(v.longEvery, 2, 10)
  );
}

export function isTimerState(v: unknown): v is TimerState {
  if (!isObj(v)) return false;
  const pendingOk =
    v.pending === null ||
    (isObj(v.pending) &&
      isStr(v.pending.id) &&
      isIntIn(v.pending.minutes, 1, 1440) &&
      isStr(v.pending.subject) &&
      isNullableStr(v.pending.taskId) &&
      isISODate(v.pending.date) &&
      isNum(v.pending.endedAt));
  return (
    (v.phase === "focus" || v.phase === "short" || v.phase === "long") &&
    (v.status === "idle" || v.status === "running" || v.status === "paused") &&
    isNum(v.durationMs) &&
    v.durationMs > 0 &&
    isNum(v.remainingMs) &&
    v.remainingMs >= 0 &&
    (v.endsAt === null || isNum(v.endsAt)) &&
    (v.status !== "running" || isNum(v.endsAt)) &&
    isIntIn(v.cycle, 0, 10) &&
    isStr(v.label) &&
    isNullableStr(v.taskId) &&
    pendingOk
  );
}
