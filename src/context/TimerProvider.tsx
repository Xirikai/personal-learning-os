"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { makeId } from "@/lib/dates";
import { TIMER_SETTINGS_KEY, TIMER_STATE_KEY, isTimerSettings, isTimerState, load, save } from "@/lib/storage";
import {
  DEFAULT_SETTINGS, clampSettings, elapsedAt, initialTimerState, remainingAt, timerReducer, type TimerCore,
} from "@/lib/timer";
import type { TimerPhase, TimerSettings, TimerState } from "@/lib/types";
import { useApp } from "./AppProvider";

type TimerApi = {
  ready: boolean;
  settings: TimerSettings;
  t: TimerState;
  now: number;
  remainingMs: number;
  elapsedMs: number;
  /** Диалог записи сессии можно закрыть, не теряя саму запись: она останется на странице таймера. */
  dialogHidden: boolean;
  hideDialog: () => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  finishEarly: () => void;
  skipBreak: () => void;
  setPhase: (p: TimerPhase) => void;
  setLabel: (label: string, taskId: string | null) => void;
  updateSettings: (s: TimerSettings) => void;
  clearPending: () => void;
};

const TimerContext = createContext<TimerApi | null>(null);

export const PHASE_LABEL: Record<TimerPhase, string> = {
  focus: "Фокус",
  short: "Короткий перерыв",
  long: "Длинный перерыв",
};

export function formatClock(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.3);
    });
    window.setTimeout(() => void ctx.close(), 1500);
  } catch {
    /* звук недоступен — не критично */
  }
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const { reportError } = useApp();
  const [core, dispatch] = useReducer(timerReducer, undefined, (): TimerCore => ({
    settings: DEFAULT_SETTINGS,
    t: initialTimerState(DEFAULT_SETTINGS),
    event: null,
  }));
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(0);
  const [dialogHidden, setDialogHidden] = useState(false);
  const baseTitle = useRef("");

  // Загрузка настроек и состояния. Если таймер «дотикал» пока вкладка была закрыта — завершаем его без звука.
  useEffect(() => {
    const s = load(TIMER_SETTINGS_KEY, isTimerSettings);
    const settings = s.status === "ok" ? clampSettings(s.value) : DEFAULT_SETTINGS;
    const st = load(TIMER_STATE_KEY, isTimerState);
    const t = st.status === "ok" ? st.value : initialTimerState(settings);
    if (s.status === "error" || st.status === "error") {
      reportError("Не удалось прочитать сохранённое состояние таймера — использованы значения по умолчанию.");
    }
    const n = Date.now();
    dispatch({ type: "hydrate", settings, t });
    dispatch({ type: "tick", now: n, id: makeId(), silent: true });
    setNow(n);
    baseTitle.current = document.title;
    setReady(true);
  }, [reportError]);

  useEffect(() => {
    if (ready && !save(TIMER_SETTINGS_KEY, core.settings)) reportError("Не удалось сохранить настройки таймера.");
  }, [core.settings, ready, reportError]);
  useEffect(() => {
    if (ready && !save(TIMER_STATE_KEY, core.t)) reportError("Не удалось сохранить состояние таймера.");
  }, [core.t, ready, reportError]);

  useEffect(() => {
    const refresh = () => {
      const s = load(TIMER_SETTINGS_KEY, isTimerSettings), st = load(TIMER_STATE_KEY, isTimerState);
      if (s.status === 'ok' && st.status === 'ok') dispatch({ type: 'hydrate', settings: clampSettings(s.value), t: st.value });
    };
    window.addEventListener('plos-cloud-applied', refresh);
    return () => window.removeEventListener('plos-cloud-applied', refresh);
  }, []);

  const running = core.t.status === "running";
  const endsAt = core.t.endsAt;

  // Отсчёт идёт по меткам времени (endsAt), поэтому троттлинг фоновых вкладок точность не ломает.
  useEffect(() => {
    if (!ready || !running) return;
    const sync = () => {
      const n = Date.now();
      setNow(n);
      dispatch({ type: "tick", now: n, id: makeId() });
    };
    const id = window.setInterval(sync, 500);
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", sync);
    window.addEventListener("pageshow", sync);
    const exact = endsAt !== null ? window.setTimeout(sync, Math.max(0, endsAt - Date.now()) + 30) : undefined;
    return () => {
      window.clearInterval(id);
      if (exact !== undefined) window.clearTimeout(exact);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", sync);
      window.removeEventListener("pageshow", sync);
    };
  }, [ready, running, endsAt]);

  // Звук при завершении фазы.
  const lastSeq = useRef(0);
  useEffect(() => {
    if (!core.event || core.event.seq === lastSeq.current) return;
    lastSeq.current = core.event.seq;
    beep();
  }, [core.event]);

  // Новая ожидающая запись снова показывает диалог.
  const pendingId = core.t.pending?.id ?? null;
  useEffect(() => {
    if (pendingId) setDialogHidden(false);
  }, [pendingId]);

  const remainingMs = ready ? remainingAt(core.t, now) : core.t.durationMs;
  const elapsedMs = ready ? elapsedAt(core.t, now) : 0;

  // Время в заголовке вкладки.
  useEffect(() => {
    if (!ready) return;
    if (core.t.status === "idle") {
      if (baseTitle.current) document.title = baseTitle.current;
      return;
    }
    const mark = core.t.status === "paused" ? "⏸ " : "";
    document.title = `${mark}${formatClock(remainingMs)} · ${PHASE_LABEL[core.t.phase]}`;
  }, [ready, core.t.status, core.t.phase, remainingMs]);

  const start = useCallback(() => {
    const n = Date.now();
    setNow(n);
    dispatch({ type: "start", now: n });
  }, []);
  const pause = useCallback(() => {
    const n = Date.now();
    setNow(n);
    dispatch({ type: "pause", now: n });
  }, []);
  const reset = useCallback(() => dispatch({ type: "reset" }), []);
  const finishEarly = useCallback(() => {
    const n = Date.now();
    setNow(n);
    dispatch({ type: "finishEarly", now: n, id: makeId() });
  }, []);
  const skipBreak = useCallback(() => dispatch({ type: "skipBreak" }), []);
  const setPhase = useCallback((phase: TimerPhase) => dispatch({ type: "setPhase", phase }), []);
  const setLabel = useCallback((label: string, taskId: string | null) => dispatch({ type: "setLabel", label, taskId }), []);
  const updateSettings = useCallback((settings: TimerSettings) => dispatch({ type: "settings", settings }), []);
  const clearPending = useCallback(() => dispatch({ type: "clearPending" }), []);
  const hideDialog = useCallback(() => setDialogHidden(true), []);

  const value = useMemo<TimerApi>(
    () => ({
      ready, settings: core.settings, t: core.t, now, remainingMs, elapsedMs, dialogHidden, hideDialog,
      start, pause, reset, finishEarly, skipBreak, setPhase, setLabel, updateSettings, clearPending,
    }),
    [ready, core.settings, core.t, now, remainingMs, elapsedMs, dialogHidden, hideDialog, start, pause, reset, finishEarly, skipBreak, setPhase, setLabel, updateSettings, clearPending],
  );

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer(): TimerApi {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used inside <TimerProvider>");
  return ctx;
}
