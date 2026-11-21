export type Task = {
  id: string;
  title: string;
  subject: string;
  due: string; // YYYY-MM-DD
  done: boolean;
  createdAt: number;
  durationMinutes?: number;
  priority?: "high" | "medium" | "low";
  mandatory?: boolean;
  splittable?: boolean;
  /** Local calendar datetime; independent of the task's deadline. */
  fixedStart?: string;
  steps?: { id: string; title: string; done: boolean }[];
};

export type Note = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  pinned?: boolean;
  taskId?: string;
};

export type Theme = "light" | "dark";

export type SessionSource = "manual" | "pomodoro";

/** Запись журнала учебных занятий. */
export type StudySession = {
  id: string;
  date: string; // YYYY-MM-DD (локальная дата)
  minutes: number; // 1–1440
  subject: string; // предмет или тема
  note: string;
  taskId: string | null; // связь с Task.id
  source: SessionSource;
  createdAt: number;
};

/** Привычка: даты, в которые она выполнена, хранятся в checks. */
export type Habit = {
  id: string;
  name: string;
  target: number; // желаемое число дней в неделю, 1–7
  checks: string[]; // YYYY-MM-DD
  createdAt: number;
};

export type GoalKind = "minutes" | "sessions" | "manual";

/** Недельная цель. minutes/sessions считаются из журнала, manual — вручную. */
export type WeeklyGoal = {
  id: string;
  title: string;
  kind: GoalKind;
  target: number; // минуты | число сессий | число повторений
  weekStart: string; // понедельник недели, YYYY-MM-DD
  subject: string; // необязательный фильтр по предмету (для minutes/sessions)
  progress: number; // только для manual
  createdAt: number;
};

export type TimerPhase = "focus" | "short" | "long";

export type TimerSettings = {
  focusMin: number;
  shortMin: number;
  longMin: number;
  longEvery: number; // длинный перерыв после N фокус-сессий
};

/** Завершённая фокус-сессия, ещё не записанная в журнал. */
export type PendingSession = {
  id: string;
  minutes: number;
  subject: string;
  taskId: string | null;
  date: string;
  endedAt: number;
};

export type TimerState = {
  phase: TimerPhase;
  status: "idle" | "running" | "paused";
  durationMs: number;
  remainingMs: number; // актуально в idle/paused
  endsAt: number | null; // актуально в running (мс since epoch)
  cycle: number; // фокус-сессий в текущем круге
  label: string;
  taskId: string | null;
  pending: PendingSession | null;
};

