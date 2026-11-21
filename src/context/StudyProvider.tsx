"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { makeId } from "@/lib/dates";
import {
  GOALS_KEY, HABITS_KEY, SESSIONS_KEY, isGoal, isHabit, isSession, loadList, save,
} from "@/lib/storage";
import type { GoalKind, Habit, SessionSource, StudySession, WeeklyGoal } from "@/lib/types";
import { useApp } from "./AppProvider";

export type NewSession = {
  date: string; minutes: number; subject: string; note: string; taskId: string | null; source?: SessionSource;
};
export type NewHabit = { name: string; target: number };
export type NewGoal = { title: string; kind: GoalKind; target: number; weekStart: string; subject: string };

type StudyState = {
  ready: boolean;
  sessions: StudySession[];
  habits: Habit[];
  goals: WeeklyGoal[];
  addSession: (input: NewSession) => void;
  updateSession: (id: string, patch: Partial<NewSession>) => void;
  deleteSession: (id: string) => void;
  addHabit: (input: NewHabit) => void;
  updateHabit: (id: string, patch: Partial<NewHabit>) => void;
  deleteHabit: (id: string) => void;
  toggleHabitCheck: (id: string, date: string) => void;
  addGoal: (input: NewGoal) => void;
  updateGoal: (id: string, patch: Partial<NewGoal>) => void;
  deleteGoal: (id: string) => void;
  adjustGoalProgress: (id: string, delta: number) => void;
};

const StudyContext = createContext<StudyState | null>(null);

export function StudyProvider({ children }: { children: ReactNode }) {
  const { reportError } = useApp();
  const [ready, setReady] = useState(false);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<WeeklyGoal[]>([]);

  // Загрузка только в браузере. Демо-данных нет: пустое хранилище = пустые списки.
  useEffect(() => {
    const problems: string[] = [];
    const s = loadList(SESSIONS_KEY, isSession);
    if (s.status === "ok") {
      setSessions(s.value);
      if (s.dropped > 0) problems.push("журнал");
    } else if (s.status === "error") problems.push("журнал");
    const h = loadList(HABITS_KEY, isHabit);
    if (h.status === "ok") {
      setHabits(h.value);
      if (h.dropped > 0) problems.push("привычки");
    } else if (h.status === "error") problems.push("привычки");
    const g = loadList(GOALS_KEY, isGoal);
    if (g.status === "ok") {
      setGoals(g.value);
      if (g.dropped > 0) problems.push("цели");
    } else if (g.status === "error") problems.push("цели");
    if (problems.length > 0) {
      reportError(
        `Часть сохранённых данных не удалось прочитать (${problems.join(", ")}). Нечитаемые записи пропущены; исходное значение сохранено в localStorage под ключом с суффиксом «.corrupt».`,
      );
    }
    setReady(true);
  }, [reportError]);

  useEffect(() => {
    if (ready && !save(SESSIONS_KEY, sessions)) reportError("Не удалось сохранить журнал занятий: хранилище браузера недоступно или переполнено.");
  }, [sessions, ready, reportError]);
  useEffect(() => {
    if (ready && !save(HABITS_KEY, habits)) reportError("Не удалось сохранить привычки: хранилище браузера недоступно или переполнено.");
  }, [habits, ready, reportError]);
  useEffect(() => {
    if (ready && !save(GOALS_KEY, goals)) reportError("Не удалось сохранить цели: хранилище браузера недоступно или переполнено.");
  }, [goals, ready, reportError]);

  useEffect(() => {
    const refresh = () => {
      const s = loadList(SESSIONS_KEY, isSession), h = loadList(HABITS_KEY, isHabit), g = loadList(GOALS_KEY, isGoal);
      if (s.status === 'ok') setSessions(s.value);
      if (h.status === 'ok') setHabits(h.value);
      if (g.status === 'ok') setGoals(g.value);
    };
    window.addEventListener('plos-cloud-applied', refresh);
    return () => window.removeEventListener('plos-cloud-applied', refresh);
  }, []);

  const addSession = useCallback((i: NewSession) => {
    setSessions((p) => [{ id: makeId(), createdAt: Date.now(), source: "manual", ...i }, ...p]);
  }, []);
  const updateSession = useCallback((id: string, patch: Partial<NewSession>) => {
    setSessions((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);
  const deleteSession = useCallback((id: string) => setSessions((p) => p.filter((s) => s.id !== id)), []);

  const addHabit = useCallback((i: NewHabit) => {
    setHabits((p) => [...p, { id: makeId(), createdAt: Date.now(), checks: [], ...i }]);
  }, []);
  const updateHabit = useCallback((id: string, patch: Partial<NewHabit>) => {
    setHabits((p) => p.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  }, []);
  const deleteHabit = useCallback((id: string) => setHabits((p) => p.filter((h) => h.id !== id)), []);
  // Отметка обратима: повторное нажатие снимает её.
  const toggleHabitCheck = useCallback((id: string, date: string) => {
    setHabits((p) =>
      p.map((h) =>
        h.id !== id ? h : { ...h, checks: h.checks.includes(date) ? h.checks.filter((d) => d !== date) : [...h.checks, date].sort() },
      ),
    );
  }, []);

  const addGoal = useCallback((i: NewGoal) => {
    setGoals((p) => [...p, { id: makeId(), createdAt: Date.now(), progress: 0, ...i }]);
  }, []);
  const updateGoal = useCallback((id: string, patch: Partial<NewGoal>) => {
    setGoals((p) => p.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }, []);
  const deleteGoal = useCallback((id: string) => setGoals((p) => p.filter((g) => g.id !== id)), []);
  const adjustGoalProgress = useCallback((id: string, delta: number) => {
    setGoals((p) =>
      p.map((g) => (g.id === id && g.kind === "manual" ? { ...g, progress: Math.min(100000, Math.max(0, g.progress + delta)) } : g)),
    );
  }, []);

  const value = useMemo<StudyState>(
    () => ({
      ready, sessions, habits, goals,
      addSession, updateSession, deleteSession,
      addHabit, updateHabit, deleteHabit, toggleHabitCheck,
      addGoal, updateGoal, deleteGoal, adjustGoalProgress,
    }),
    [ready, sessions, habits, goals, addSession, updateSession, deleteSession, addHabit, updateHabit, deleteHabit, toggleHabitCheck, addGoal, updateGoal, deleteGoal, adjustGoalProgress],
  );

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}

export function useStudy(): StudyState {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error("useStudy must be used inside <StudyProvider>");
  return ctx;
}
