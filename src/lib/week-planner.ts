import { shiftISO } from "./dates";
import { createPlan, taskDefaults, type SavedPlan, type Fatigue, type PlannerData } from "./smart-planner";
import { addLocalMinutes, eventBusyTimes, type WorkspaceData } from "./workspace";
import type { Task } from "./types";
export type WeekProposal = { days: SavedPlan[]; remaining: { taskId: string; minutes: number }[] };
/** Distributes work once across the week; task duration/deadline records remain unchanged. */
export function createWeekPlan(tasks: readonly Task[], workspace: WorkspaceData, first: string, fatigue: Fatigue, now: string, planner?: PlannerData): WeekProposal {
  const prefs = workspace.preferences;
  const available = Array.from({ length: 7 }, (_, i) => shiftISO(first, i)).filter((d) => prefs.weekdays.includes((new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7 + 1) && d >= now.slice(0, 10));
  const left = new Map(tasks.filter((t) => !t.done).map((t) => [t.id, taskDefaults(t).durationMinutes]));
  const days: SavedPlan[] = [];
  for (const [index, date] of available.entries()) {
    const total = [...left.values()].reduce((a, b) => a + b, 0);
    const urgent = tasks.some((t) => !t.done && t.due <= date && (left.get(t.id) ?? 0) > 0);
    const dailyTarget = Math.min(prefs.dailyMinutes, urgent ? prefs.dailyMinutes : Math.ceil(total / (available.length - index) / 5) * 5);
    const candidates = tasks.filter((t) => (left.get(t.id) ?? 0) > 0 && (!t.fixedStart || t.fixedStart.slice(0, 10) === date)).map((t) => ({ ...t, durationMinutes: left.get(t.id)! }));
    // The budget limits actual study time without consuming it for breaks.
    const selected: Task[] = candidates.filter((t) => !!t.fixedStart);
    let budget = Math.max(0, dailyTarget - selected.reduce((sum, t) => sum + taskDefaults(t).durationMinutes, 0));
    const rank = { high: 0, medium: 1, low: 2 };
    for (const t of candidates.filter((t) => !t.fixedStart).sort((a, b) => Number(!!b.mandatory) - Number(!!a.mandatory) || (a.mandatory && b.mandatory ? a.due.localeCompare(b.due) : 0) || rank[taskDefaults(a).priority] - rank[taskDefaults(b).priority] || a.due.localeCompare(b.due) || a.createdAt - b.createdAt || a.id.localeCompare(b.id))) {
      const p = taskDefaults(t);
      if (budget <= 0 || !p.splittable && p.durationMinutes > budget) continue;
      const minutes = p.splittable ? Math.min(p.durationMinutes, budget) : p.durationMinutes;
      selected.push({ ...t, durationMinutes: minutes }); budget -= minutes;
    }
    const settings = { date, startTime: prefs.startTime, endTime: prefs.endTime, fatigue, breakMinutes: 15, mode: "replan" as const, currentTime: now, delayMinutes: 0, unavailable: [] };
    const otherFixed = tasks.filter((t) => !t.done && t.fixedStart && !selected.some((s) => s.id === t.id)).map((t) => ({ id: t.id, title: t.title, start: t.fixedStart!, end: addLocalMinutes(t.fixedStart!, taskDefaults(t).durationMinutes) }));
    const otherPlans = Object.entries(planner?.days ?? {}).filter(([day]) => !available.includes(day)).flatMap(([, p]) => p.result.blocks.filter((b) => b.kind !== "free" && b.kind !== "break" && b.kind !== "fixed").map((b) => ({ id: b.id, title: b.label ?? "Существующий план", start: b.start, end: b.end })));
    const result = createPlan(selected, settings, [...eventBusyTimes(workspace.events, date), ...otherFixed, ...otherPlans]);
    for (const block of result.blocks) if (block.taskId && (block.kind === "study" || block.kind === "fixed")) {
      const minutes = (Date.parse(`${block.end}:00Z`) - Date.parse(`${block.start}:00Z`)) / 60000;
      left.set(block.taskId, Math.max(0, left.get(block.taskId)! - minutes));
    }
    // The final day shows the true week remainder instead of repeating deferred work on each day.
    const past = (planner?.days[date]?.result.blocks ?? []).filter((b) => b.start < now).map((b) => ({ ...b, end: b.end > now ? now : b.end }));
    const blocks = [...past, ...result.blocks];
    const studyMinutes = blocks.filter((b) => b.kind === "study" || b.kind === "fixed").reduce((sum, b) => sum + (Date.parse(`${b.end}:00Z`) - Date.parse(`${b.start}:00Z`)) / 60000, 0);
    days.push({ settings, result: { ...result, blocks, studyMinutes, unscheduled: [] }, taskIds: selected.map((t) => t.id), updatedAt: now });
  }
  const remaining = [...left].filter(([, minutes]) => minutes > 0).map(([taskId, minutes]) => ({ taskId, minutes }));
  if (days.length) days[days.length - 1].result.unscheduled = remaining.map((r) => ({ taskId: r.taskId, remainingMinutes: r.minutes, reason: "insufficient-time", suggestedDate: shiftISO(first, 7) }));
  return { days, remaining };
}
