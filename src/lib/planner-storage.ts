import type { Task } from "./types";
import { emptyPlanner, isPlannerData, isPlanResult, isPlanSettings, type PlannerData, type PlanResult, type PlanSettings } from "./smart-planner";

export const PLANNER_KEY = "plos.smart-planner.v1";
export const PLANNER_RECOVERY_KEY = "plos.smart-planner.recovery.v1";
export const PLANNER_DRAFT_KEY = "plos.smart-planner.draft.v1";
const TASKS_KEY = "plos.tasks.v1";
export type PlannerStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function preparePlanChange(tasks: Task[], planner: PlannerData, draftTasks: Task[], settings: PlanSettings, result: PlanResult, savedAt: string) {
  if (!isPlanSettings(settings) || !isPlanResult(result) || !result.canApply) throw new Error("invalid-plan");
  const ids = new Set<string>();
  for (const t of draftTasks) {
    if (ids.has(t.id)) throw new Error("duplicate-task");
    ids.add(t.id);
  }
  const drafts = new Map(draftTasks.map((t) => [t.id, t]));
  const existing = new Set(tasks.map((t) => t.id));
  const nextTasks = tasks.map((t) => drafts.has(t.id) ? { ...t, ...drafts.get(t.id) } : t);
  nextTasks.push(...draftTasks.filter((t) => !existing.has(t.id)).map((t) => ({ ...t })));
  const past = settings.mode === "replan" ? (planner.days[settings.date]?.result.blocks ?? [])
    .filter((b) => b.start < settings.currentTime)
    .map((b) => ({ ...b, end: b.end > settings.currentTime ? settings.currentTime : b.end })) : [];
  const blocks = [...past, ...result.blocks];
  const studyMinutes = blocks.filter((b) => b.kind === "study" || b.kind === "fixed")
    .reduce((sum, b) => sum + (Date.parse(`${b.end}:00Z`) - Date.parse(`${b.start}:00Z`)) / 60000, 0);
  const mergedResult = { ...result, blocks, studyMinutes };
  const nextPlanner: PlannerData = { version: 1, days: { ...planner.days, [settings.date]: {
    settings, result: mergedResult, taskIds: draftTasks.map((t) => t.id), updatedAt: savedAt,
  } } };
  return { tasks: nextTasks, planner: nextPlanner };
}

/** Explicit commit only. A recovery snapshot precedes writes; failed writes roll back.
 * Compare both records to prevent an older preview overwriting another tab's edits.
 * Existing tasks remain in their original v1 record; extensions are optional fields.
 */
export function commitPlanChange(storage: PlannerStorage, beforeTasks: Task[], beforePlanner: PlannerData, next: { tasks: Task[]; planner: PlannerData }) {
  if (!isPlannerData(next.planner)) throw new Error("invalid-plan");
  const oldTasks = storage.getItem(TASKS_KEY), oldPlanner = storage.getItem(PLANNER_KEY);
  if (oldTasks !== JSON.stringify(beforeTasks) || (oldPlanner ?? JSON.stringify(emptyPlanner())) !== JSON.stringify(beforePlanner)) throw new Error("stale-preview");
  storage.setItem(PLANNER_RECOVERY_KEY, JSON.stringify({ version: 1, tasks: oldTasks, planner: oldPlanner }));
  try {
    storage.setItem(TASKS_KEY, JSON.stringify(next.tasks));
    storage.setItem(PLANNER_KEY, JSON.stringify(next.planner));
  } catch (error) {
    for (const [key, value] of [[TASKS_KEY, oldTasks], [PLANNER_KEY, oldPlanner]] as const) {
      try { value === null ? storage.removeItem(key) : storage.setItem(key, value); } catch { /* recovery snapshot remains available */ }
    }
    throw error;
  }
}
