import {
  GOALS_KEY, HABITS_KEY, NOTES_KEY, SESSIONS_KEY, TASKS_KEY, THEME_KEY,
  TIMER_SETTINGS_KEY, TIMER_STATE_KEY, isGoal, isHabit, isNoteArray, isSession,
  isTaskArray, isTimerSettings, isTimerState,
} from "./storage";
import type { Habit, Note, StudySession, Task, Theme, TimerSettings, TimerState, WeeklyGoal } from "./types";
import { emptyPlanner, isPlannerData, type PlannerData } from "./smart-planner";
import { PLANNER_KEY, PLANNER_RECOVERY_KEY } from "./planner-storage";
import { emptyWorkspace, isWorkspace, WORKSPACE_KEY, type WorkspaceData } from "./workspace";

export type AppBackup = {
  format: "personal-learning-os-backup";
  version: 1;
  createdAt: string;
  data: {
    tasks: Task[];
    notes: Note[];
    sessions: StudySession[];
    habits: Habit[];
    goals: WeeklyGoal[];
    theme: Theme;
    timerSettings: TimerSettings;
    timerState: TimerState;
    planner?: PlannerData;
    workspace?: WorkspaceData;
  };
};

export type SyncMarker = { userId: string; cloudUpdatedAt: string; snapshot: string };
export const SYNC_MARKER_KEY = "plos.sync.marker.v1";

export function syncSnapshot(backup: AppBackup): string {
  return JSON.stringify({ ...backup.data, timerState: { ...backup.data.timerState, remainingMs: 0 } });
}

export function readSyncMarker(): SyncMarker | null {
  try {
    const raw = localStorage.getItem(SYNC_MARKER_KEY);
    if (!raw) return null;
    const marker: unknown = JSON.parse(raw);
    if (typeof marker === "object" && marker !== null &&
      typeof (marker as SyncMarker).userId === "string" &&
      typeof (marker as SyncMarker).cloudUpdatedAt === "string" &&
      typeof (marker as SyncMarker).snapshot === "string") return marker as SyncMarker;
  } catch { /* a damaged sync marker is safe to ignore */ }
  return null;
}

export function writeSyncMarker(marker: SyncMarker) {
  localStorage.setItem(SYNC_MARKER_KEY, JSON.stringify(marker));
  window.dispatchEvent(new Event("plos-sync-marker"));
}

function readJson<T>(key: string, fallback: T, guard: (value: unknown) => value is T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  const value: unknown = JSON.parse(raw);
  if (!guard(value)) throw new Error(`Не удалось прочитать сохранённые данные: ${key}`);
  return value;
}

export function createBackup(): AppBackup {
  const list = <T,>(key: string, guard: (value: unknown) => value is T): T[] => {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || !value.every(guard)) throw new Error(`В данных ${key} есть ошибки. Сначала восстановите их в приложении.`);
    return value;
  };
  const settings = readJson(TIMER_SETTINGS_KEY, { focusMin: 25, shortMin: 5, longMin: 15, longEvery: 4 }, isTimerSettings);
  const timer = readJson(TIMER_STATE_KEY, {
    phase: "focus", status: "idle", durationMs: 25 * 60_000, remainingMs: 25 * 60_000,
    endsAt: null, cycle: 0, label: "", taskId: null, pending: null,
  } as TimerState, isTimerState);
  const storedTheme = localStorage.getItem(THEME_KEY);
  const theme: Theme = storedTheme === "dark" ? "dark" : "light";
  return {
    format: "personal-learning-os-backup", version: 1, createdAt: new Date().toISOString(),
    data: {
      tasks: list(TASKS_KEY, (v): v is Task => isTaskArray([v])),
      notes: list(NOTES_KEY, (v): v is Note => isNoteArray([v])),
      sessions: list(SESSIONS_KEY, isSession), habits: list(HABITS_KEY, isHabit), goals: list(GOALS_KEY, isGoal),
      theme, timerSettings: settings, timerState: timer, planner: readJson(PLANNER_KEY, emptyPlanner(), isPlannerData),
      workspace: readJson(WORKSPACE_KEY, emptyWorkspace(), isWorkspace),
    },
  };
}

export function isAppBackup(value: unknown): value is AppBackup {
  if (typeof value !== "object" || value === null) return false;
  const backup = value as Partial<AppBackup>;
  const data = backup.data;
  return backup.format === "personal-learning-os-backup" && backup.version === 1 &&
    typeof backup.createdAt === "string" && !!data &&
    isTaskArray(data.tasks) && isNoteArray(data.notes) &&
    Array.isArray(data.sessions) && data.sessions.every(isSession) &&
    Array.isArray(data.habits) && data.habits.every(isHabit) &&
    Array.isArray(data.goals) && data.goals.every(isGoal) &&
    (data.theme === "light" || data.theme === "dark") &&
    isTimerSettings(data.timerSettings) && isTimerState(data.timerState) && (data.planner === undefined || isPlannerData(data.planner)) && (data.workspace === undefined || isWorkspace(data.workspace));
}

export function restoreBackup(backup: AppBackup) {
  const writes: Array<[string, unknown]> = [
    [TASKS_KEY, backup.data.tasks], [NOTES_KEY, backup.data.notes],
    [SESSIONS_KEY, backup.data.sessions], [HABITS_KEY, backup.data.habits],
    [GOALS_KEY, backup.data.goals], [THEME_KEY, backup.data.theme],
    [TIMER_SETTINGS_KEY, backup.data.timerSettings], [TIMER_STATE_KEY, backup.data.timerState],
    [PLANNER_KEY, backup.data.planner ?? emptyPlanner()],
    [WORKSPACE_KEY, backup.data.workspace ?? emptyWorkspace()],
  ];
  const before = writes.map(([key]) => [key, localStorage.getItem(key)] as const);
  localStorage.setItem(PLANNER_RECOVERY_KEY, JSON.stringify({ version: 1, records: before }));
  try {
    for (const [key, value] of writes) localStorage.setItem(key, key === THEME_KEY ? String(value) : JSON.stringify(value));
  } catch (error) {
    for (const [key, value] of before) {
      try { value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch { /* rollback best effort */ }
    }
    throw error;
  }
}
