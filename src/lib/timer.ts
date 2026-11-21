import { toISODate } from "./dates";
import type { PendingSession, TimerPhase, TimerSettings, TimerState } from "./types";

export const DEFAULT_SETTINGS: TimerSettings = { focusMin: 25, shortMin: 5, longMin: 15, longEvery: 4 };

const clampInt = (v: number, min: number, max: number, fallback: number) =>
  Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback;

export function clampSettings(s: TimerSettings): TimerSettings {
  return {
    focusMin: clampInt(s.focusMin, 1, 180, DEFAULT_SETTINGS.focusMin),
    shortMin: clampInt(s.shortMin, 1, 60, DEFAULT_SETTINGS.shortMin),
    longMin: clampInt(s.longMin, 1, 120, DEFAULT_SETTINGS.longMin),
    longEvery: clampInt(s.longEvery, 2, 10, DEFAULT_SETTINGS.longEvery),
  };
}

export function phaseMs(phase: TimerPhase, s: TimerSettings): number {
  const min = phase === "focus" ? s.focusMin : phase === "short" ? s.shortMin : s.longMin;
  return min * 60_000;
}

export function initialTimerState(s: TimerSettings): TimerState {
  const d = phaseMs("focus", s);
  return {
    phase: "focus", status: "idle", durationMs: d, remainingMs: d, endsAt: null,
    cycle: 0, label: "", taskId: null, pending: null,
  };
}

/** Core = то, что хранит провайдер. event — не сохраняется, нужен для звука/уведомления. */
export type TimerCore = {
  settings: TimerSettings;
  t: TimerState;
  event: { seq: number; kind: "focus-done" | "break-done" } | null;
};

export type TimerAction =
  | { type: "hydrate"; settings: TimerSettings; t: TimerState }
  | { type: "start"; now: number }
  | { type: "pause"; now: number }
  | { type: "reset" }
  | { type: "tick"; now: number; id: string; silent?: boolean }
  | { type: "finishEarly"; now: number; id: string }
  | { type: "skipBreak" }
  | { type: "setPhase"; phase: TimerPhase }
  | { type: "setLabel"; label: string; taskId: string | null }
  | { type: "settings"; settings: TimerSettings }
  | { type: "clearPending" };

/** Оставшееся время с учётом статуса; не выходит за пределы [0, durationMs]. */
export function remainingAt(t: TimerState, now: number): number {
  if (t.status === "running" && t.endsAt !== null) return Math.min(t.durationMs, Math.max(0, t.endsAt - now));
  return Math.min(t.durationMs, Math.max(0, t.remainingMs));
}

export function elapsedAt(t: TimerState, now: number): number {
  return t.durationMs - remainingAt(t, now);
}

const isBreak = (p: TimerPhase) => p !== "focus";

function toPhase(t: TimerState, phase: TimerPhase, s: TimerSettings, patch: Partial<TimerState> = {}): TimerState {
  const d = phaseMs(phase, s);
  return { ...t, phase, status: "idle", durationMs: d, remainingMs: d, endsAt: null, ...patch };
}

function makePending(t: TimerState, id: string, minutes: number, endedAt: number): PendingSession {
  return { id, minutes, subject: t.label.trim(), taskId: t.taskId, date: toISODate(new Date(endedAt)), endedAt };
}

export function timerReducer(core: TimerCore, a: TimerAction): TimerCore {
  const { settings: s, t } = core;
  switch (a.type) {
    case "hydrate":
      return { settings: a.settings, t: a.t, event: null };

    case "start": {
      if (t.status === "running") return core;
      if (t.phase === "focus" && t.pending) return core; // сначала нужно разобраться с прошлой сессией
      const rem = remainingAt(t, a.now);
      const remainingMs = rem <= 0 ? t.durationMs : rem;
      return { ...core, t: { ...t, status: "running", remainingMs, endsAt: a.now + remainingMs } };
    }

    case "pause": {
      if (t.status !== "running") return core;
      return { ...core, t: { ...t, status: "paused", remainingMs: remainingAt(t, a.now), endsAt: null } };
    }

    case "reset":
      return { ...core, t: toPhase(t, t.phase, s) };

    case "tick": {
      if (t.status !== "running" || t.endsAt === null || t.endsAt > a.now) return core;
      const seq = (core.event?.seq ?? 0) + 1;
      if (t.phase === "focus") {
        const minutes = Math.max(1, Math.round(t.durationMs / 60_000));
        const cycle = Math.min(10, t.cycle + 1);
        const next: TimerPhase = cycle >= s.longEvery ? "long" : "short";
        return {
          settings: s,
          t: toPhase(t, next, s, { cycle, pending: makePending(t, a.id, minutes, t.endsAt) }),
          event: a.silent ? core.event : { seq, kind: "focus-done" },
        };
      }
      return {
        settings: s,
        t: toPhase(t, "focus", s, { cycle: t.phase === "long" ? 0 : t.cycle }),
        event: a.silent ? core.event : { seq, kind: "break-done" },
      };
    }

    case "finishEarly": {
      if (t.phase !== "focus" || t.status === "idle" || t.pending) return core;
      const minutes = Math.floor(elapsedAt(t, a.now) / 60_000);
      if (minutes < 1) return core;
      return { ...core, t: toPhase(t, "short", s, { pending: makePending(t, a.id, Math.min(minutes, 1440), a.now) }) };
    }

    case "skipBreak":
      if (!isBreak(t.phase)) return core;
      return { ...core, t: toPhase(t, "focus", s, { cycle: t.phase === "long" ? 0 : t.cycle }) };

    case "setPhase":
      if (t.status !== "idle" || t.phase === a.phase) return core;
      return { ...core, t: toPhase(t, a.phase, s) };

    case "setLabel":
      return { ...core, t: { ...t, label: a.label.slice(0, 120), taskId: a.taskId } };

    case "settings": {
      const ns = clampSettings(a.settings);
      // Если текущая фаза ещё не начиналась, сразу применяем новую длительность.
      const untouched = t.status === "idle" && t.remainingMs === t.durationMs;
      return { ...core, settings: ns, t: untouched ? toPhase(t, t.phase, ns) : t };
    }

    case "clearPending":
      return t.pending ? { ...core, t: { ...t, pending: null } } : core;
  }
}
