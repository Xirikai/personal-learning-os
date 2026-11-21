import { shiftISO, weekDatesISO } from "./dates";
import type { Habit, StudySession, WeeklyGoal } from "./types";

export const NO_SUBJECT = "Без предмета";

/** «45 мин», «2 ч», «1 ч 05 мин». */
export function formatMinutes(total: number): string {
  const m = Math.max(0, Math.round(total));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} мин`;
  if (r === 0) return `${h} ч`;
  return `${h} ч ${String(r).padStart(2, "0")} мин`;
}

const sameSubject = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function minutesOn(sessions: StudySession[], iso: string): number {
  return sessions.reduce((s, x) => (x.date === iso ? s + x.minutes : s), 0);
}

export function sessionsOn(sessions: StudySession[], iso: string): StudySession[] {
  return sessions.filter((x) => x.date === iso);
}

/** Сессии недели (Пн–Вс), в которую попадает weekStart; опционально по предмету. */
export function sessionsInWeek(sessions: StudySession[], weekStart: string, subject = ""): StudySession[] {
  const end = shiftISO(weekStart, 6);
  return sessions.filter(
    (x) => x.date >= weekStart && x.date <= end && (!subject.trim() || sameSubject(x.subject, subject)),
  );
}

export function minutesInWeek(sessions: StudySession[], weekStart: string, subject = ""): number {
  return sessionsInWeek(sessions, weekStart, subject).reduce((s, x) => s + x.minutes, 0);
}

export type DayPoint = { iso: string; minutes: number };

export function weekSeries(sessions: StudySession[], anyDayOfWeek: string): DayPoint[] {
  return weekDatesISO(anyDayOfWeek).map((iso) => ({ iso, minutes: minutesOn(sessions, iso) }));
}

export type SubjectTotal = { subject: string; minutes: number };

export function totalsBySubject(list: StudySession[]): SubjectTotal[] {
  const map = new Map<string, SubjectTotal>();
  for (const s of list) {
    const name = s.subject.trim() || NO_SUBJECT;
    const key = name.toLowerCase();
    const cur = map.get(key);
    if (cur) cur.minutes += s.minutes;
    else map.set(key, { subject: name, minutes: s.minutes });
  }
  return [...map.values()].sort((a, b) => b.minutes - a.minutes);
}

export type GoalProgress = { current: number; target: number; remaining: number; percent: number; done: boolean };

export function goalProgress(goal: WeeklyGoal, sessions: StudySession[]): GoalProgress {
  let current: number;
  if (goal.kind === "manual") current = goal.progress;
  else {
    const list = sessionsInWeek(sessions, goal.weekStart, goal.subject);
    current = goal.kind === "minutes" ? list.reduce((s, x) => s + x.minutes, 0) : list.length;
  }
  const remaining = Math.max(0, goal.target - current);
  const percent = goal.target > 0 ? Math.min(100, Math.round((current / goal.target) * 100)) : 0;
  return { current, target: goal.target, remaining, percent, done: current >= goal.target };
}

export function formatGoalValue(goal: WeeklyGoal, value: number): string {
  return goal.kind === "minutes" ? formatMinutes(value) : String(value);
}

export function goalUnit(goal: WeeklyGoal): string {
  return goal.kind === "sessions" ? "сессий" : goal.kind === "manual" ? "раз" : "";
}

/** Сколько дней недели привычка выполнена. */
export function habitWeekDone(habit: Habit, anyDayOfWeek: string): number {
  const days = new Set(weekDatesISO(anyDayOfWeek));
  return new Set(habit.checks.filter((c) => days.has(c))).size;
}

/** Серия подряд выполненных дней; если сегодня ещё не отмечено, серия считается до вчера. */
export function habitStreak(habit: Habit, today: string): number {
  const set = new Set(habit.checks);
  let day = set.has(today) ? today : shiftISO(today, -1);
  let n = 0;
  while (set.has(day)) {
    n++;
    day = shiftISO(day, -1);
  }
  return n;
}

export type HabitSummary = { total: number; doneToday: number; weekDone: number; weekPossible: number; percent: number };

/** Общая статистика привычек: выполнено сегодня и доля отметок недели от цели. */
export function habitSummary(habits: Habit[], today: string, weekDay: string): HabitSummary {
  const days = weekDatesISO(weekDay).filter((d) => d <= today);
  let weekDone = 0;
  let weekPossible = 0;
  for (const h of habits) {
    const set = new Set(h.checks);
    weekDone += Math.min(h.target, days.filter((d) => set.has(d)).length);
    weekPossible += h.target;
  }
  return {
    total: habits.length,
    doneToday: habits.filter((h) => h.checks.includes(today)).length,
    weekDone,
    weekPossible,
    percent: weekPossible === 0 ? 0 : Math.round((weekDone / weekPossible) * 100),
  };
}
