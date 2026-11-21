import { test } from "node:test";
import assert from "node:assert/strict";
import { createPlan, emptyPlanner, isPlannerData, type PlanSettings, type PlanResult } from "../src/lib/smart-planner";
import { commitPlanChange, preparePlanChange, PLANNER_KEY, PLANNER_RECOVERY_KEY } from "../src/lib/planner-storage";
import { isAppBackup, createBackup, restoreBackup } from "../src/lib/backup";
import type { Task } from "../src/lib/types";

const settings: PlanSettings = { date: "2026-11-19", startTime: "16:00", endTime: "20:00", fatigue: "low", breakMinutes: 15, mode: "plan", currentTime: "2026-11-19T19:00", delayMinutes: 0, unavailable: [] };
const task = (id: string, patch: Partial<Task> = {}): Task => ({ id, title: id, subject: "", due: settings.date, done: false, createdAt: 1, durationMinutes: 60, priority: "high", mandatory: false, splittable: false, ...patch });
function invariant(result: PlanResult) {
  for (let i = 0; i < result.blocks.length; i++) {
    assert.ok(result.blocks[i].end > result.blocks[i].start);
    if (i) assert.ok(result.blocks[i].start >= result.blocks[i - 1].end, JSON.stringify(result.blocks));
  }
}
class MemoryStorage {
  records = new Map<string, string>();
  failKey = "";
  getItem(key: string) { return this.records.get(key) ?? null; }
  removeItem(key: string) { this.records.delete(key); }
  setItem(key: string, value: string) {
    if (key === this.failKey) { this.failKey = ""; throw new Error("quota"); }
    this.records.set(key, value);
  }
}
test("several tasks fit with their exact duration and deterministic breaks", () => {
  const result = createPlan([task("a"), task("b"), task("c", { durationMinutes: 45, priority: "medium" })], settings);
  assert.equal(result.unscheduled.length, 0);
  assert.equal(result.studyMinutes, 165);
  assert.deepEqual(result.blocks.filter((b) => b.kind === "study").map((b) => [b.start.slice(11), b.end.slice(11)]), [["16:00", "17:00"], ["17:15", "18:15"], ["18:30", "19:15"]]);
  invariant(result);
});
test("overflow retains every unfinished task and leaves deadlines unchanged", () => {
  const tasks = [task("a"), task("b"), task("c")];
  const before = JSON.stringify(tasks);
  const result = createPlan(tasks, { ...settings, endTime: "17:00" });
  assert.equal(result.unscheduled.length, 2);
  assert.equal(JSON.stringify(tasks), before);
  assert.equal(result.unscheduled[0].suggestedDate, "2026-11-20");
});
test("high fatigue schedules only essential work in <=20 minute blocks and <=60 minute total", () => {
  const result = createPlan([task("a", { splittable: true, durationMinutes: 100 }), task("b", { priority: "low" })], { ...settings, fatigue: "high", breakMinutes: 0 });
  assert.equal(result.studyMinutes, 60);
  assert.ok(result.blocks.filter((b) => b.kind === "study").every((b) => Date.parse(b.end) - Date.parse(b.start) <= 20 * 60000));
  assert.ok(result.unscheduled.some((u) => u.taskId === "b" && u.reason === "fatigue"));
  assert.equal(result.unscheduled.find((u) => u.taskId === "a")?.remainingMinutes, 40);
  invariant(result);
});
test("fixed event remains at its original time, regardless of priority", () => {
  const result = createPlan([task("flex", { splittable: true }), task("fixed", { fixedStart: "2026-11-19T16:30", priority: "low" })], settings);
  assert.equal(result.blocks.find((b) => b.taskId === "fixed")?.start, "2026-11-19T16:30");
  invariant(result);
});
test("overlapping fixed events block applying the plan", () => {
  const result = createPlan([task("a", { fixedStart: "2026-11-19T17:00" }), task("b", { fixedStart: "2026-11-19T17:30" })], settings);
  assert.equal(result.canApply, false);
  assert.ok(result.unscheduled.some((u) => u.reason === "fixed-conflict"));
  invariant(result);
});
test("busy intervals merge, and fixed events cannot override them", () => {
  const result = createPlan([task("a", { fixedStart: "2026-11-19T17:00" })], { ...settings, unavailable: [
    { id: "x", title: "x", start: "2026-11-19T16:30", end: "2026-11-19T17:15" },
    { id: "y", title: "y", start: "2026-11-19T17:00", end: "2026-11-19T18:00" },
  ] });
  assert.equal(result.canApply, false);
  assert.equal(result.blocks.filter((b) => b.kind === "unavailable").length, 1);
  invariant(result);
});
test("no tasks and all completed have explicit states", () => {
  assert.ok(createPlan([], settings).warnings.some((w) => w.code === "no-tasks"));
  assert.ok(createPlan([task("a", { done: true })], settings).warnings.some((w) => w.code === "all-done"));
});
test("no time, equal endpoints and tasks longer than a day are handled", () => {
  const result = createPlan([task("a")], { ...settings, mode: "replan", currentTime: "2026-11-19T21:00" });
  assert.equal(result.studyMinutes, 0);
  assert.equal(result.unscheduled.length, 1);
  assert.ok(result.warnings.some((w) => w.code === "no-time"));
  assert.equal(createPlan([], { ...settings, endTime: settings.startTime }).canApply, false);
  assert.equal(createPlan([task("x", { durationMinutes: 1441 })], settings).canApply, false);
});
test("replanning starts after the specified current time and additional delay", () => {
  const result = createPlan([task("a", { durationMinutes: 30 }), task("b")], { ...settings, mode: "replan", delayMinutes: 15 });
  assert.equal(result.blocks[0].start, "2026-11-19T19:15");
  assert.equal(result.unscheduled.length, 1);
  invariant(result);
});
test("an ongoing fixed event reserves its remaining time during replanning", () => {
  const result = createPlan([task("a", { fixedStart: "2026-11-19T18:30" }), task("b", { splittable: true })], { ...settings, mode: "replan" });
  assert.equal(result.blocks[0].kind, "fixed");
  assert.equal(result.blocks[0].start, "2026-11-19T19:00");
  assert.equal(result.blocks[0].end, "2026-11-19T19:30");
  invariant(result);
});
test("overnight planning and next-day current times use calendar minutes", () => {
  const overnight = { ...settings, startTime: "23:00", endTime: "02:00" };
  const result = createPlan([task("a"), task("b")], overnight);
  assert.equal(result.blocks.filter((b) => b.kind === "study")[1].start, "2026-11-20T00:15");
  const replan = createPlan([task("a")], { ...overnight, mode: "replan", currentTime: "2026-11-20T00:30" });
  assert.equal(replan.blocks[0].start, "2026-11-20T00:30");
  invariant(result); invariant(replan);
});
test("mandatory tasks sort by deadline and stable ties sort by ID", () => {
  const result = createPlan([task("b"), task("a"), task("urgent", { mandatory: true, priority: "low", due: "2026-11-18" })], settings);
  assert.deepEqual(result.blocks.filter((b) => b.kind === "study").map((b) => b.taskId), ["urgent", "a", "b"]);
  assert.ok(result.warnings.some((w) => w.code === "overdue"));
  assert.deepEqual(result, createPlan([task("b"), task("a"), task("urgent", { mandatory: true, priority: "low", due: "2026-11-18" })], settings));
});
test("medium fatigue splits long work; unsplittable tasks remain visible", () => {
  const result = createPlan([task("a", { splittable: true }), task("b")], { ...settings, fatigue: "medium", breakMinutes: 0 });
  assert.equal(result.blocks.filter((b) => b.taskId === "a").length, 2);
  assert.ok(result.unscheduled.some((u) => u.taskId === "b" && u.reason === "fatigue"));
  invariant(result);
});
test("legacy task fields get safe defaults without mutating old records", () => {
  const old = { id: "old", title: "old", subject: "", due: settings.date, done: false, createdAt: 1 };
  const result = createPlan([old], settings);
  assert.equal(result.studyMinutes, 30);
  assert.equal("priority" in old, false);
});
test("invalid times, duplicate IDs, invalid dates and negative durations fail safely", () => {
  assert.equal(createPlan([], { ...settings, startTime: "25:00" }).canApply, false);
  assert.equal(createPlan([task("a"), task("a")], settings).canApply, false);
  assert.equal(createPlan([task("a", { due: "2026-02-31" })], settings).canApply, false);
  assert.equal(createPlan([task("a", { durationMinutes: -3 })], settings).canApply, false);
});
test("confirmation persists the schedule with original IDs and a recovery snapshot", () => {
  const storage = new MemoryStorage(), tasks = [task("a")], planner = emptyPlanner();
  storage.setItem("plos.tasks.v1", JSON.stringify(tasks));
  const next = preparePlanChange(tasks, planner, tasks, settings, createPlan(tasks, settings), "2026-11-19T00:00:00Z");
  commitPlanChange(storage, tasks, planner, next);
  assert.equal(JSON.parse(storage.getItem("plos.tasks.v1")!)[0].id, "a");
  assert.ok(isPlannerData(JSON.parse(storage.getItem(PLANNER_KEY)!)));
  assert.ok(storage.getItem(PLANNER_RECOVERY_KEY));
});
test("preview/cancel does not write or mutate any source record", () => {
  const storage = new MemoryStorage(), tasks = [task("a")], planner = emptyPlanner();
  storage.setItem("plos.tasks.v1", JSON.stringify(tasks));
  const before = JSON.stringify([...storage.records]);
  const draft = [{ ...tasks[0], done: true }];
  preparePlanChange(tasks, planner, draft, settings, createPlan(draft, settings), "date");
  assert.equal(tasks[0].done, false);
  assert.equal(JSON.stringify([...storage.records]), before);
});
test("failed saving rolls back tasks and keeps recovery data", () => {
  const storage = new MemoryStorage(), tasks = [task("a")], planner = emptyPlanner();
  storage.setItem("plos.tasks.v1", JSON.stringify(tasks));
  const next = preparePlanChange(tasks, planner, [{ ...tasks[0], title: "edited" }], settings, createPlan(tasks, settings), "date");
  storage.failKey = PLANNER_KEY;
  assert.throws(() => commitPlanChange(storage, tasks, planner, next), /quota/);
  assert.equal(storage.getItem("plos.tasks.v1"), JSON.stringify(tasks));
  assert.equal(storage.getItem(PLANNER_KEY), null);
  assert.ok(storage.getItem(PLANNER_RECOVERY_KEY));
});
test("another tab's changes reject a stale preview", () => {
  const storage = new MemoryStorage(), tasks = [task("a")], planner = emptyPlanner();
  storage.setItem("plos.tasks.v1", JSON.stringify([{ ...tasks[0], title: "another tab" }]));
  const next = preparePlanChange(tasks, planner, tasks, settings, createPlan(tasks, settings), "date");
  assert.throws(() => commitPlanChange(storage, tasks, planner, next), /stale-preview/);
});
test("replanning retains earlier blocks in the saved day", () => {
  const tasks = [task("a"), task("b")], planner = preparePlanChange(tasks, emptyPlanner(), tasks, settings, createPlan(tasks, settings), "date").planner;
  const replan = { ...settings, mode: "replan" as const, currentTime: "2026-11-19T17:05" };
  const next = preparePlanChange(tasks, planner, [tasks[1]], replan, createPlan([tasks[1]], replan), "date");
  assert.ok(next.planner.days[settings.date].result.blocks.some((b) => b.start === "2026-11-19T16:00"));
  assert.equal(next.planner.days[settings.date].result.studyMinutes, 120);
  invariant(next.planner.days[settings.date].result);
});
test("backup export/import retains plans and accepts old backups without planner", () => {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
  const tasks = [task("a")];
  storage.setItem("plos.tasks.v1", JSON.stringify(tasks));
  const next = preparePlanChange(tasks, emptyPlanner(), tasks, settings, createPlan(tasks, settings), "date");
  commitPlanChange(storage, tasks, emptyPlanner(), next);
  const backup = createBackup();
  assert.equal(isAppBackup(backup), true);
  restoreBackup(backup);
  assert.equal(storage.getItem(PLANNER_KEY), JSON.stringify(backup.data.planner));
  const legacy = { ...backup, data: { ...backup.data } };
  delete legacy.data.planner;
  assert.ok(isAppBackup(legacy));
});
test("a separate device starts empty and can restore a complete backup", () => {
  const source = new MemoryStorage(), tasks = [task("a")];
  Object.defineProperty(globalThis, "localStorage", { value: source, configurable: true });
  source.setItem("plos.tasks.v1", JSON.stringify(tasks));
  commitPlanChange(source, tasks, emptyPlanner(), preparePlanChange(tasks, emptyPlanner(), tasks, settings, createPlan(tasks, settings), "date"));
  const backup = createBackup(), target = new MemoryStorage();
  Object.defineProperty(globalThis, "localStorage", { value: target, configurable: true });
  assert.equal(target.getItem(PLANNER_KEY), null);
  restoreBackup(backup);
  assert.ok(isPlannerData(JSON.parse(target.getItem(PLANNER_KEY)!)));
});
test("many deterministic windows never overlap and account for every remaining minute", () => {
  for (let i = 1; i <= 80; i++) {
    const tasks = Array.from({ length: 7 }, (_, j) => task(`t${j}`, { durationMinutes: 5 + (i * (j + 7) % 120), splittable: j % 2 === 0, priority: j % 2 ? "medium" : "high" }));
    const result = createPlan(tasks, { ...settings, fatigue: i % 3 === 0 ? "high" : i % 3 === 1 ? "medium" : "low", endTime: `${17 + i % 4}:00` });
    invariant(result);
    const planned = result.blocks.filter((b) => b.kind === "study").reduce((n, b) => n + (Date.parse(b.end) - Date.parse(b.start)) / 60000, 0);
    assert.equal(planned + result.unscheduled.reduce((n, u) => n + u.remainingMinutes, 0), tasks.reduce((n, t) => n + t.durationMinutes!, 0));
  }
});
test("saved commitments from an adjacent day block overnight collisions", () => {
  const result = createPlan([task("a", { durationMinutes: 60, splittable: true })], { ...settings, startTime: "23:30", endTime: "02:00" }, [
    { id: "other-day", title: "Saved event", start: "2026-11-20T00:00", end: "2026-11-20T01:00" },
  ]);
  assert.ok(result.blocks.some((b) => b.kind === "unavailable" && b.start === "2026-11-20T00:00"));
  invariant(result);
});
test("invalid edited completed tasks cannot be applied", () => {
  assert.equal(createPlan([task("a", { done: true, title: "" })], settings).canApply, false);
});
test("import validation rejects overlapping schedule blocks", () => {
  const tasks = [task("a"), task("b")];
  const data = preparePlanChange(tasks, emptyPlanner(), tasks, settings, createPlan(tasks, settings), "date").planner;
  data.days[settings.date].result.blocks[1].start = "2026-11-19T16:00";
  assert.equal(isPlannerData(data), false);
});
