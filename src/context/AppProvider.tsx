"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { makeId, todayISO } from "@/lib/dates";
import { demoNotes, demoTasks } from "@/lib/seed";
import { NOTES_KEY, TASKS_KEY, THEME_KEY, isNoteArray, isTaskArray, load, save } from "@/lib/storage";
import type { Note, Task, Theme } from "@/lib/types";
import { emptyPlanner, isPlannerData, type PlannerData, type PlanSettings, type PlanResult } from "@/lib/smart-planner";
import { PLANNER_KEY, preparePlanChange, commitPlanChange } from "@/lib/planner-storage";
import { emptyWorkspace, isWorkspace, WORKSPACE_KEY, type WorkspaceData } from "@/lib/workspace";
import type { SavedPlan } from "@/lib/smart-planner";

type NewTask = Omit<Task, "id" | "done" | "createdAt">;
type NewNote = Omit<Note, "id" | "createdAt">;

type AppState = {
  hydrated: boolean;
  today: string;
  theme: Theme;
  toggleTheme: () => void;
  tasks: Task[];
  planner: PlannerData;
  workspace: WorkspaceData;
  updateWorkspace: (data: WorkspaceData) => boolean;
  applyWeekPlan: (days: SavedPlan[], expectedTasks: Task[], expectedPlanner: PlannerData) => void;
  applySmartPlan: (draftTasks: Task[], settings: PlanSettings, result: PlanResult, expectedTasks: Task[], expectedPlanner: PlannerData) => void;
  notes: Note[];
  addTask: (input: NewTask) => void;
  toggleTask: (id: string) => void;
  updateTask: (id: string, patch: Partial<NewTask>) => void;
  deleteTask: (id: string) => void;
  addNote: (input: NewNote) => void;
  updateNote: (id: string, patch: Partial<NewNote>) => void;
  deleteNote: (id: string) => void;
  storageError: string | null;
  dismissStorageError: () => void;
  reportError: (message: string) => void;
};

const AppContext = createContext<AppState | null>(null);

function readTheme(): Theme {
  try {
    const s = localStorage.getItem(THEME_KEY);
    if (s === "dark" || s === "light") return s;
  } catch {
    /* localStorage недоступно — берём системную тему */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [today, setToday] = useState("");
  const [theme, setTheme] = useState<Theme>("light");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [planner, setPlanner] = useState<PlannerData>(emptyPlanner);
  const [workspace, setWorkspace] = useState<WorkspaceData>(emptyWorkspace);
  const [notes, setNotes] = useState<Note[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);

  // Первичная загрузка из localStorage (только в браузере)
  useEffect(() => {
    const problems: string[] = [];
    const ws = load(WORKSPACE_KEY, isWorkspace);
    if (ws.status === "ok") setWorkspace(ws.value);
    else if (ws.status === "error") problems.push("календарь и карточки повторения");
    const plan = load(PLANNER_KEY, isPlannerData);
    if (plan.status === "ok") setPlanner(plan.value);
    else if (plan.status === "error") problems.push("Smart Planner (резервная копия сохранена)");

    const t = load(TASKS_KEY, isTaskArray);
    if (t.status === "ok") setTasks(t.value);
    else {
      setTasks(demoTasks());
      if (t.status === "error") problems.push("задачи");
    }

    const n = load(NOTES_KEY, isNoteArray);
    if (n.status === "ok") setNotes(n.value);
    else {
      setNotes(demoNotes());
      if (n.status === "error") problems.push("заметки");
    }

    if (problems.length > 0) {
      setStorageError(
        `Не удалось прочитать сохранённые данные (${problems.join(", ")}). Показаны демонстрационные данные.`,
      );
    }

    setTheme(readTheme());
    setToday(todayISO());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    save(THEME_KEY, theme);
  }, [theme, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (!save(TASKS_KEY, tasks)) {
      setStorageError("Не удалось сохранить задачи: хранилище браузера недоступно или переполнено.");
    }
  }, [tasks, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (!save(NOTES_KEY, notes)) {
      setStorageError("Не удалось сохранить заметки: хранилище браузера недоступно или переполнено.");
    }
  }, [notes, hydrated]);

  const toggleTheme = useCallback(() => setTheme((p) => (p === "dark" ? "light" : "dark")), []);

  useEffect(() => {
    const refresh = (event: StorageEvent) => {
      if (event.key === WORKSPACE_KEY) {
        const ws = load(WORKSPACE_KEY, isWorkspace);
        if (ws.status === "ok") setWorkspace(ws.value);
        return;
      }
      if (event.key !== TASKS_KEY && event.key !== PLANNER_KEY && event.key !== NOTES_KEY) return;
      const nextNotes = load(NOTES_KEY, isNoteArray);
      if (nextNotes.status === "ok") setNotes(nextNotes.value);
      const nextTasks = load(TASKS_KEY, isTaskArray);
      const nextPlanner = load(PLANNER_KEY, isPlannerData);
      if (nextTasks.status === "ok") setTasks(nextTasks.value);
      if (nextPlanner.status === "ok") setPlanner(nextPlanner.value);
    };
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  useEffect(() => {
    const refresh = () => {
      const t = load(TASKS_KEY, isTaskArray), n = load(NOTES_KEY, isNoteArray);
      const p = load(PLANNER_KEY, isPlannerData), w = load(WORKSPACE_KEY, isWorkspace);
      if (t.status === 'ok') setTasks(t.value);
      if (n.status === 'ok') setNotes(n.value);
      if (p.status === 'ok') setPlanner(p.value);
      if (w.status === 'ok') setWorkspace(w.value);
      setTheme(readTheme());
    };
    window.addEventListener('plos-cloud-applied', refresh);
    return () => window.removeEventListener('plos-cloud-applied', refresh);
  }, []);

  const applySmartPlan = useCallback((draftTasks: Task[], settings: PlanSettings, result: PlanResult, expectedTasks: Task[], expectedPlanner: PlannerData) => {
    if (JSON.stringify(tasks) !== JSON.stringify(expectedTasks) || JSON.stringify(planner) !== JSON.stringify(expectedPlanner)) throw new Error("stale-preview");
    const next = preparePlanChange(tasks, planner, draftTasks, settings, result, new Date().toISOString());
    commitPlanChange(localStorage, tasks, planner, next);
    setTasks(next.tasks);
    setPlanner(next.planner);
  }, [tasks, planner]);

  const updateWorkspace = useCallback((data: WorkspaceData) => {
    if (!isWorkspace(data)) { setStorageError("Проверьте параметры календаря и повторений."); return false; }
    try {
      const raw = localStorage.getItem(WORKSPACE_KEY);
      if (raw && raw !== JSON.stringify(workspace)) throw new Error("stale");
      if (raw) localStorage.setItem(`${WORKSPACE_KEY}.recovery`, raw);
      localStorage.setItem(WORKSPACE_KEY, JSON.stringify(data)); setWorkspace(data); return true;
    } catch { setStorageError("Не удалось сохранить изменения. Другая вкладка могла изменить данные или хранилище заполнено. Обновите страницу после экспорта данных."); return false; }
  }, [workspace]);
  const applyWeekPlan = useCallback((days: SavedPlan[], expectedTasks: Task[], expectedPlanner: PlannerData) => {
    if (JSON.stringify(tasks) !== JSON.stringify(expectedTasks) || JSON.stringify(planner) !== JSON.stringify(expectedPlanner)) throw new Error("Данные изменились. Пересчитайте неделю.");
    const nextPlanner = { version: 1 as const, days: { ...planner.days } };
    for (const day of days) nextPlanner.days[day.settings.date] = day;
    commitPlanChange(localStorage, tasks, planner, { tasks, planner: nextPlanner }); setPlanner(nextPlanner);
  }, [tasks, planner]);

  const addTask = useCallback((input: NewTask) => {
    setTasks((p) => [{ id: makeId(), done: false, createdAt: Date.now(), ...input }, ...p]);
  }, []);
  const toggleTask = useCallback((id: string) => {
    setTasks((p) => p.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }, []);
  const updateTask = useCallback((id: string, patch: Partial<NewTask>) => {
    setTasks((p) => p.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);
  const deleteTask = useCallback((id: string) => setTasks((p) => p.filter((t) => t.id !== id)), []);

  const addNote = useCallback((input: NewNote) => {
    setNotes((p) => [{ id: makeId(), createdAt: Date.now(), ...input }, ...p]);
  }, []);
  const updateNote = useCallback((id: string, patch: Partial<NewNote>) => {
    setNotes((p) => p.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }, []);
  const deleteNote = useCallback((id: string) => setNotes((p) => p.filter((n) => n.id !== id)), []);

  const dismissStorageError = useCallback(() => setStorageError(null), []);
  const reportError = useCallback((message: string) => setStorageError(message), []);

  // «Сегодня» обновляется, если вкладка осталась открытой после полуночи.
  useEffect(() => {
    if (!hydrated) return;
    const refresh = () => setToday((prev) => {
      const now = todayISO();
      return now === prev ? prev : now;
    });
    const id = window.setInterval(refresh, 30_000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [hydrated]);

  const value = useMemo<AppState>(
    () => ({
      hydrated, today, theme, toggleTheme, tasks, notes, planner, applySmartPlan, workspace, updateWorkspace, applyWeekPlan,
      addTask, toggleTask, updateTask, deleteTask, addNote, updateNote, deleteNote,
      storageError, dismissStorageError, reportError,
    }),
    [hydrated, today, theme, toggleTheme, tasks, notes, planner, applySmartPlan, workspace, updateWorkspace, applyWeekPlan, addTask, toggleTask, updateTask, deleteTask, addNote, updateNote, deleteNote, storageError, dismissStorageError, reportError],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
