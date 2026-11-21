"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/context/AppProvider";
import { makeId, todayISO } from "@/lib/dates";
import { isTaskArray } from "@/lib/storage";
import { PLANNER_DRAFT_KEY } from "@/lib/planner-storage";
import { createPlan, isPlanSettings, isPlannerData, taskDefaults, type Language, type PlanBlock, type PlannerData, type PlanResult, type PlanSettings } from "@/lib/smart-planner";
import { messages, reasonText, warningText } from "@/lib/planner-i18n";
import { eventBusyTimes, isWorkspace, type WorkspaceData } from "@/lib/workspace";
import type { Task } from "@/lib/types";
import { btnPrimary, btnSecondary, inputCls, labelCls } from "@/lib/ui";
import { Card } from "./Card";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

type Draft = { version: 1; settings: PlanSettings; entries: Task[]; included: string[]; baseTasks: Task[]; basePlanner: PlannerData; baseWorkspace?: WorkspaceData };
function isDraft(v: unknown): v is Draft {
  if (!v || typeof v !== "object") return false;
  const d = v as Draft;
  return d.version === 1 && isPlanSettings(d.settings) && isTaskArray(d.entries) && isTaskArray(d.baseTasks) &&
    isPlannerData(d.basePlanner) && (d.baseWorkspace === undefined || isWorkspace(d.baseWorkspace)) && Array.isArray(d.included) && d.included.every((id) => typeof id === "string");
}
function localNow() {
  const now = new Date();
  return `${todayISO()}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}
function clockLabel(value: string, date: string, language: Language) {
  return `${value.slice(11)}${value.slice(0, 10) !== date ? language === "ru" ? " (+1 день)" : " (+1 day)" : ""}`;
}
export function PlanTimeline({ blocks, tasks, date, language }: { blocks: PlanBlock[]; tasks: Task[]; date: string; language: Language }) {
  const m = messages[language];
  const names = new Map(tasks.map((task) => [task.id, task]));
  return <ol className="space-y-2" aria-label={m.schedule}>
    {blocks.map((block) => {
      const task = block.taskId ? names.get(block.taskId) : undefined;
      const study = block.kind === "study" || block.kind === "fixed";
      const label = task?.title ?? (block.taskId ? m.deleted : block.label || (block.kind === "break" ? m.rest : block.kind === "free" ? m.free : m.unavailable));
      const duration = Math.round((Date.parse(`${block.end}:00Z`) - Date.parse(`${block.start}:00Z`)) / 60000);
      return <li key={block.id} className={`flex min-w-0 gap-3 rounded-xl border px-3 py-3 ${study ? "border-indigo-100 bg-indigo-50/70 dark:border-indigo-500/20 dark:bg-indigo-500/10" : "border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40"}`}>
        <Icon name={block.kind === "fixed" ? "calendar" : study ? "studyos" : "timer"} className={`mt-0.5 h-4 w-4 shrink-0 ${study ? "text-indigo-500" : "text-slate-400"}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm tabular-nums text-slate-500 dark:text-slate-400">{clockLabel(block.start, date, language)} – {clockLabel(block.end, date, language)}</p>
          <p className={`break-words text-sm font-medium ${task?.done ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-100"}`}>{label}</p>
          {block.kind === "fixed" && <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-300">{m.fixedBlock}</p>}
        </div>
        <span className="shrink-0 text-sm text-slate-500 dark:text-slate-400">{duration} {m.minutes}</span>
      </li>;
    })}
  </ol>;
}

export function SmartPlanner({ date, language, onDateChange, compact = false }: { date: string; language: Language; onDateChange: (date: string) => void; compact?: boolean }) {
  const { tasks, planner, workspace } = useApp();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [notice, setNotice] = useState("");
  const m = messages[language];
  const saved = planner.days[date];
  function open(mode: PlanSettings["mode"]) {
    try {
      const raw = localStorage.getItem(PLANNER_DRAFT_KEY);
      if (raw) {
        let parsed: unknown;
        try { parsed = JSON.parse(raw); } catch { parsed = null; }
        if (isDraft(parsed)) { setDraft(parsed); setNotice(m.restored); return; }
        localStorage.setItem(`${PLANNER_DRAFT_KEY}.corrupt`, raw);
        setNotice(m.invalidDraft);
      } else setNotice("");
    } catch { setNotice(m.draftError); }
    const current = localNow();
    const defaults: PlanSettings = { date, startTime: "16:00", endTime: "20:00", fatigue: "low", breakMinutes: 15, mode, currentTime: current, delayMinutes: 0, unavailable: [] };
    const settings = saved ? { ...saved.settings, mode, currentTime: current, delayMinutes: 0 } : defaults;
    const previous = new Set(saved?.taskIds ?? []);
    setDraft({ version: 1, settings, entries: tasks.map((t) => ({ ...t })), baseTasks: tasks, basePlanner: planner, baseWorkspace: workspace,
      included: tasks.filter((t) => t.due <= date || previous.has(t.id)).map((t) => t.id) });
  }
  function close() {
    try { localStorage.removeItem(PLANNER_DRAFT_KEY); } catch { /* draft can still be reopened */ }
    setDraft(null);
    setNotice("");
  }
  return <>
    <Card className="mb-6 border-indigo-100! dark:border-indigo-500/20!">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-indigo-100 p-2.5 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"><Icon name="calendar" /></span>
          <div><h2 className="font-semibold">{m.title}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{m.tagline}</p><p className="mt-1 text-xs text-indigo-600 dark:text-indigo-300">{m.local}</p></div>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <button className={btnPrimary} onClick={() => open("plan")}><Icon name="calendar" className="h-4 w-4" />{m.open}</button>
          <button className={btnSecondary} onClick={() => open("replan")}><Icon name="reset" className="h-4 w-4" />{m.replan}</button>
        </div>
      </div>
      {notice && !draft && <p role="status" className="mt-3 text-sm text-indigo-600 dark:text-indigo-300">{notice}</p>}
      {saved && <details className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800" open={!compact}>
        <summary className="mb-3 cursor-pointer text-sm font-medium">{m.schedule} · {saved.result.studyMinutes} {m.minutes}</summary>
        <div className="grid gap-4 lg:grid-cols-2">
          <PlanTimeline blocks={saved.result.blocks} tasks={tasks} date={date} language={language} />
          <div className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
            {saved.result.unscheduled.length > 0 && <h3 className="font-medium text-slate-800 dark:text-slate-200">{m.remaining}</h3>}
            {saved.result.unscheduled.map((u) => <div key={u.taskId} className="rounded-xl border border-amber-200 p-3 dark:border-amber-500/20"><p className="break-words font-medium text-slate-800 dark:text-slate-200">{tasks.find((t) => t.id === u.taskId)?.title ?? m.deleted} · {u.remainingMinutes} {m.minutes}</p><p className="mt-1">{reasonText(u.reason, language)}</p></div>)}
            <p>{m.device}</p>
          </div>
        </div>
      </details>}
    </Card>
    <Modal open={!!draft} onClose={close} title={draft?.settings.mode === "replan" ? m.replan : m.open} wide closeLabel={m.close}>
      {draft && <PlannerEditor initial={draft} language={language} notice={notice} onDraft={setDraft} onCancel={close} onApplied={(appliedDate) => { close(); onDateChange(appliedDate); setNotice(m.saved); }} />}
    </Modal>
  </>;
}

function PlannerEditor({ initial, language, notice, onDraft, onCancel, onApplied }: {
  initial: Draft; language: Language; notice: string; onDraft: (draft: Draft) => void; onCancel: () => void; onApplied: (date: string) => void;
}) {
  const { applySmartPlan, workspace } = useApp();
  const [draft, setDraft] = useState(initial);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [error, setError] = useState("");
  const [draftError, setDraftError] = useState(false);
  const m = messages[language];
  const s = draft.settings;
  useEffect(() => {
    try { localStorage.setItem(PLANNER_DRAFT_KEY, JSON.stringify(draft)); setDraftError(false); }
    catch { setDraftError(true); }
  }, [draft]);
  function change(next: Draft) {
    // Save in the event itself, so a reload cannot race the following React effect.
    try { localStorage.setItem(PLANNER_DRAFT_KEY, JSON.stringify(next)); setDraftError(false); }
    catch { setDraftError(true); }
    setDraft(next); onDraft(next); setResult(null); setError("");
  }
  function settings(patch: Partial<PlanSettings>) { change({ ...draft, settings: { ...s, ...patch } }); }
  function task(id: string, patch: Partial<Task>) { change({ ...draft, entries: draft.entries.map((t) => t.id === id ? { ...t, ...patch } : t) }); }
  const reserved = (t: Task) => {
    if (!t.fixedStart) return false;
    const start = `${s.date}T${s.startTime}`;
    const end = `${s.endTime < s.startTime ? nextDate(s.date) : s.date}T${s.endTime}`;
    const fixedEnd = Date.parse(`${t.fixedStart}:00Z`) + taskDefaults(t).durationMinutes * 60000;
    return t.fixedStart < end && fixedEnd > Date.parse(`${start}:00Z`);
  };
  const selected = draft.entries.filter((t) => draft.included.includes(t.id) || reserved(t));
  function calculate() {
    // Other saved days can extend past midnight. Keep their commitments in place.
    const commitments = Object.entries(draft.basePlanner.days).filter(([day]) => day !== s.date).flatMap(([, plan]) =>
      plan.result.blocks.filter((b) => b.kind !== "free" && b.kind !== "break" &&
        !(b.kind === "fixed" && selected.some((t) => t.id === b.taskId && t.fixedStart))).map((b) => ({
        id: b.id, start: b.start, end: b.end, title: b.label || draft.entries.find((t) => t.id === b.taskId)?.title || m.fixedBlock,
      })));
    setResult(createPlan(selected, s, [...commitments, ...eventBusyTimes((draft.baseWorkspace ?? workspace).events, s.date)]));
    setError("");
  }
  function apply() {
    if (!result?.canApply) return;
    try {
      if (draft.baseWorkspace && JSON.stringify(workspace) !== JSON.stringify(draft.baseWorkspace)) throw new Error("stale-preview");
      applySmartPlan(selected, s, result, draft.baseTasks, draft.basePlanner); onApplied(s.date);
    }
    catch (e) { setError(e instanceof Error && e.message === "stale-preview" ? m.stale : m.storage); }
  }
  return <div lang={language} className="space-y-5">
    <p className="text-sm text-slate-500 dark:text-slate-400">{m.local}</p>
    {notice && <p role="status" className="rounded-xl bg-indigo-50 p-3 text-sm text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">{notice}</p>}
    {draftError && <p role="alert" className="text-sm text-amber-700 dark:text-amber-300">{m.draftError}</p>}
    {!result ? <>
      <section aria-label={m.settings} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className={labelCls}>{m.date}<input className={`${inputCls} mt-1.5`} type="date" value={s.date} onInput={(e) => {
            const newDate = e.currentTarget.value;
            change({ ...draft, settings: { ...s, date: newDate }, included: draft.entries.filter((t) => t.due <= newDate || (draft.basePlanner.days[newDate]?.taskIds ?? []).includes(t.id)).map((t) => t.id) });
          }} /></label>
          <label className={labelCls}>{m.start}<input className={`${inputCls} mt-1.5`} type="time" value={s.startTime} onInput={(e) => settings({ startTime: e.currentTarget.value })} /></label>
          <label className={labelCls}>{m.end}<input className={`${inputCls} mt-1.5`} type="time" value={s.endTime} onInput={(e) => settings({ endTime: e.currentTarget.value })} /></label>
          <label className={labelCls}>{m.fatigue}<select className={`${inputCls} mt-1.5`} value={s.fatigue} onChange={(e) => settings({ fatigue: e.target.value as PlanSettings["fatigue"] })}><option value="low">{m.low}</option><option value="medium">{m.medium}</option><option value="high">{m.high}</option></select></label>
          <label className={labelCls}>{m.break}<input className={`${inputCls} mt-1.5`} type="number" min="0" max="120" value={Number.isNaN(s.breakMinutes) ? "" : s.breakMinutes} onChange={(e) => settings({ breakMinutes: e.target.valueAsNumber })} /></label>
        </div>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{m.nextDay}</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{m.fatigueHint}</p>
        {s.mode === "replan" && <div className="mt-4 rounded-xl bg-amber-50 p-3 dark:bg-amber-500/10">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelCls}>{m.now}<input className={`${inputCls} mt-1.5`} type="datetime-local" value={s.currentTime} onInput={(e) => settings({ currentTime: e.currentTarget.value })} /></label>
            <label className={labelCls}>{m.delay}<input className={`${inputCls} mt-1.5`} type="number" min="0" max="1440" value={Number.isNaN(s.delayMinutes) ? "" : s.delayMinutes} onChange={(e) => settings({ delayMinutes: e.target.valueAsNumber })} /></label>
          </div><p className="text-sm text-amber-900 dark:text-amber-200">{m.delayHint}</p>
        </div>}
      </section>
      <section aria-label={m.tasks}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{m.tasks} <span className="text-sm font-normal text-slate-500">· {m.selected}: {selected.length}</span></h3><button className={btnSecondary} onClick={() => {
          const id = makeId();
          change({ ...draft, entries: [...draft.entries, { id, title: m.newTask, subject: "", due: s.date, done: false, createdAt: Date.now(), durationMinutes: 30, priority: "medium", mandatory: false, splittable: true }], included: [...draft.included, id] });
        }}><Icon name="plus" className="h-4 w-4" />{m.addTask}</button></div>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{m.taskHint}</p>
        {!draft.entries.length && <p className="py-4 text-sm text-slate-500">{m.empty}</p>}
        <div className="space-y-3">
          {draft.entries.map((t) => {
            const p = taskDefaults(t), active = draft.included.includes(t.id) || reserved(t);
            return <div key={t.id} className={`min-w-0 rounded-2xl border p-3 sm:p-4 ${active ? "border-indigo-200 dark:border-indigo-500/30" : "border-slate-200 dark:border-slate-800"}`}>
              <div className="flex items-start gap-3">
                <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-indigo-600" checked={active} disabled={reserved(t)} aria-label={`${m.include}: ${t.title}`} onChange={(e) => change({ ...draft, included: e.target.checked ? [...draft.included, t.id] : draft.included.filter((id) => id !== t.id) })} />
                <div className="min-w-0 flex-1"><p className={`break-words font-medium ${t.done ? "text-slate-400 line-through" : ""}`}>{t.title}</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.subject} {t.due < s.date && !t.done ? `· ${m.overdue}` : ""}</p></div>
                <label className="flex shrink-0 items-center gap-1.5 text-sm text-slate-500"><input className="h-4 w-4 accent-indigo-600" type="checkbox" checked={t.done} disabled={!active} onChange={(e) => task(t.id, { done: e.target.checked })} />{m.completed}</label>
              </div>
              {active && <div className="mt-3 space-y-3">
                <label className={labelCls}>{m.name}<input className={`${inputCls} mt-1`} value={t.title} onChange={(e) => task(t.id, { title: e.target.value })} /></label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className={labelCls}>{m.duration}<input className={`${inputCls} mt-1`} type="number" min="1" max="1440" value={Number.isNaN(p.durationMinutes) ? "" : p.durationMinutes} onChange={(e) => task(t.id, { durationMinutes: e.target.valueAsNumber })} /></label>
                  <label className={labelCls}>{m.priority}<select className={`${inputCls} mt-1`} value={p.priority} onChange={(e) => task(t.id, { priority: e.target.value as Task["priority"] })}><option value="high">{m.priorityHigh}</option><option value="medium">{m.priorityMedium}</option><option value="low">{m.priorityLow}</option></select></label>
                  <label className={labelCls}>{m.deadline}<input className={`${inputCls} mt-1`} type="date" value={t.due} onInput={(e) => task(t.id, { due: e.currentTarget.value })} /></label>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={p.mandatory} onChange={(e) => task(t.id, { mandatory: e.target.checked })} />{m.mandatory}</label>
                  <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={p.splittable} onChange={(e) => task(t.id, { splittable: e.target.checked })} />{m.split}</label>
                  <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={!!t.fixedStart} onChange={(e) => task(t.id, { fixedStart: e.target.checked ? `${s.date}T${s.startTime}` : undefined })} />{m.fixed}</label>
                </div>
                {t.fixedStart && <label className={labelCls}>{m.fixedTime}<input className={`${inputCls} mt-1`} type="datetime-local" value={t.fixedStart} onInput={(e) => task(t.id, { fixedStart: e.currentTarget.value })} /><span className="mt-1 block text-sm font-normal text-slate-500">{m.fixedHint}</span></label>}
              </div>}
            </div>;
          })}
        </div>
      </section>
      <section aria-label={m.busy} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
        <h3 className="mb-3 font-semibold">{m.busy}</h3>
        <div className="space-y-3">{s.unavailable.map((busy) => <div key={busy.id} className="grid gap-3 sm:grid-cols-2">
          <label className={`${labelCls} sm:col-span-2`}>{m.busyName}<input className={`${inputCls} mt-1`} value={busy.title} onChange={(e) => settings({ unavailable: s.unavailable.map((b) => b.id === busy.id ? { ...b, title: e.target.value } : b) })} /></label>
          <label className={labelCls}>{m.busyStart}<input className={`${inputCls} mt-1`} type="datetime-local" value={busy.start} onInput={(e) => settings({ unavailable: s.unavailable.map((b) => b.id === busy.id ? { ...b, start: e.currentTarget.value } : b) })} /></label>
          <label className={labelCls}>{m.busyEnd}<input className={`${inputCls} mt-1`} type="datetime-local" value={busy.end} onInput={(e) => settings({ unavailable: s.unavailable.map((b) => b.id === busy.id ? { ...b, end: e.currentTarget.value } : b) })} /></label>
          <button className={`${btnSecondary} mb-3 justify-self-start`} onClick={() => settings({ unavailable: s.unavailable.filter((b) => b.id !== busy.id) })}>{m.remove}</button>
        </div>)}</div>
        <button className={btnSecondary} onClick={() => settings({ unavailable: [...s.unavailable, { id: makeId(), title: m.unavailable, start: `${s.date}T17:00`, end: `${s.date}T18:00` }] })}><Icon name="plus" className="h-4 w-4" />{m.addBusy}</button>
      </section>
    </> : <section aria-label={m.preview} className="space-y-4">
      <h3 className="text-lg font-semibold">{m.preview} · {result.studyMinutes} {m.minutes}</h3>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div><PlanTimeline blocks={result.blocks} tasks={draft.entries} date={s.date} language={language} />{!result.blocks.length && <p className="py-4 text-sm text-slate-500">{m.noPlan}</p>}</div>
        <div className="space-y-3">
          {result.warnings.map((w, i) => <p key={i} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">{w.taskId && <strong className="mb-1 block break-words">{draft.entries.find((t) => t.id === w.taskId)?.title}</strong>}{warningText(w, language)}</p>)}
          {result.unscheduled.length > 0 && <h4 className="font-semibold">{m.remaining}</h4>}
          {result.unscheduled.map((u, i) => <div key={`${u.taskId}-${i}`} className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-sm dark:border-amber-500/25 dark:bg-amber-500/5"><p className="break-words font-semibold">{draft.entries.find((t) => t.id === u.taskId)?.title} · {u.remainingMinutes} {m.minutes}</p><p className="mt-2 text-slate-600 dark:text-slate-300">{reasonText(u.reason, language)}</p><p className="mt-2 text-slate-500 dark:text-slate-400">{language === "ru" ? "Предлагаемая дата" : "Suggested date"}: {u.suggestedDate}. {language === "ru" ? "Перенос не применяется автоматически." : "No transfer is applied automatically."}</p></div>)}
        </div>
      </div>
    </section>}
    <p className="text-sm text-slate-500 dark:text-slate-400">{m.confirm}</p>
    {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    <div className="sticky bottom-0 -mx-1 flex flex-wrap gap-2 border-t border-slate-100 bg-white/95 px-1 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      {!result ? <button className={btnPrimary} onClick={calculate}>{s.mode === "replan" ? m.replan : m.calculate}</button> : <>
        <button className={btnPrimary} disabled={!result.canApply || (!selected.length && !s.unavailable.length)} onClick={apply}><Icon name="check" className="h-4 w-4" />{m.apply}</button>
        <button className={btnSecondary} onClick={() => setResult(null)}>{m.edit}</button>
      </>}
      <button className={btnSecondary} onClick={onCancel}>{m.cancel}</button>
    </div>
  </div>;
}

function nextDate(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(d.getTime())) return date;
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
