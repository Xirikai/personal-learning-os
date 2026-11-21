"use client";
import { useState } from "react";
import { useApp } from "@/context/AppProvider";
import { weekStartISO, shiftISO } from "@/lib/dates";
import { createWeekPlan, type WeekProposal } from "@/lib/week-planner";
import { localDateTime, type WorkspaceData } from "@/lib/workspace";
import type { Fatigue, Language } from "@/lib/smart-planner";
import { btnPrimary, btnSecondary, inputCls, labelCls } from "@/lib/ui";
import { Modal } from "./Modal";
import { PlanTimeline } from "./SmartPlanner";

export function WeekPlanner({ date, language }: { date: string; language: Language }) {
  const app = useApp();
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(app.workspace.preferences);
  const [first, setFirst] = useState(weekStartISO(date));
  const [fatigue, setFatigue] = useState<Fatigue>("low");
  const [proposal, setProposal] = useState<WeekProposal | null>(null);
  const [baseline, setBaseline] = useState({ tasks: app.tasks, planner: app.planner, workspace: app.workspace });
  const [error, setError] = useState("");
  const tr = (ru: string, en: string) => language === "ru" ? ru : en;
  function launch() { setPrefs(app.workspace.preferences); setFirst(weekStartISO(date)); setBaseline({ tasks: app.tasks, planner: app.planner, workspace: app.workspace }); setProposal(null); setError(""); setOpen(true); }
  return <>
    <button className={btnSecondary} onClick={launch}>{tr("Распланировать неделю", "Plan a week")}</button>
    <Modal open={open} onClose={() => setOpen(false)} title={tr("Планирование недели", "Weekly planning")} wide closeLabel={tr("Закрыть", "Close")}>
      <div className="space-y-4">
        <p className="text-sm text-slate-500">{tr("Распределение оставшейся нагрузки по учебным дням. События календаря и перерывы учитываются. Дедлайны не меняются.", "Spread remaining work across study days while keeping calendar events and breaks. Deadlines stay unchanged.")}</p>
        {!proposal ? <>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={labelCls}>{tr("Первый день", "First day")}<input className={`${inputCls} mt-1`} type="date" value={first} onInput={(e) => setFirst(e.currentTarget.value)} /></label>
            <label className={labelCls}>{tr("Начало занятий", "Study starts")}<input className={`${inputCls} mt-1`} type="time" value={prefs.startTime} onInput={(e) => setPrefs({ ...prefs, startTime: e.currentTarget.value })} /></label>
            <label className={labelCls}>{tr("Конец занятий", "Study ends")}<input className={`${inputCls} mt-1`} type="time" value={prefs.endTime} onInput={(e) => setPrefs({ ...prefs, endTime: e.currentTarget.value })} /></label>
            <label className={labelCls}>{tr("Учебных минут в день", "Daily study minutes")}<input className={`${inputCls} mt-1`} type="number" min={15} max={720} value={prefs.dailyMinutes} onChange={(e) => setPrefs({ ...prefs, dailyMinutes: e.target.valueAsNumber })} /></label>
            <label className={labelCls}>{tr("Усталость", "Fatigue")}<select className={`${inputCls} mt-1`} value={fatigue} onChange={(e) => setFatigue(e.target.value as Fatigue)}><option value="low">{tr("Низкая", "Low")}</option><option value="medium">{tr("Средняя", "Medium")}</option><option value="high">{tr("Высокая", "High")}</option></select></label>
          </div>
          <div className="flex flex-wrap gap-3">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((name, i) => <label key={name} className="flex gap-2 text-sm"><input type="checkbox" checked={prefs.weekdays.includes(i + 1)} onChange={(e) => setPrefs({ ...prefs, weekdays: e.target.checked ? [...prefs.weekdays, i + 1] : prefs.weekdays.filter((d) => d !== i + 1) })} />{language === "ru" ? name : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}</label>)}</div>
          <button className={btnPrimary} onClick={() => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(first) || !Number.isInteger(prefs.dailyMinutes) || prefs.dailyMinutes < 15 || prefs.dailyMinutes > 720 || !prefs.weekdays.length || !prefs.startTime || prefs.startTime === prefs.endTime) { setError(tr("Проверьте дату, время, дни и лимит нагрузки.", "Check the date, times, study days and daily limit.")); return; }
            setProposal(createWeekPlan(baseline.tasks, { ...baseline.workspace, preferences: prefs }, first, fatigue, localDateTime(new Date()), baseline.planner)); setError("");
          }}>{tr("Предпросмотр недели", "Preview week")}</button>
        </> : <>
          <div className="grid gap-3 md:grid-cols-2">{proposal.days.map((day) => <details key={day.settings.date} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><summary className="cursor-pointer text-sm font-medium">{day.settings.date} · {day.result.studyMinutes} {tr("мин", "min")}</summary><div className="mt-3"><PlanTimeline blocks={day.result.blocks} tasks={baseline.tasks} date={day.settings.date} language={language} /></div></details>)}</div>
          {!proposal.days.length && <p className="text-sm text-amber-600">{tr("Не осталось выбранных учебных дней. Укажите будущую неделю.", "No study days remain. Choose a future week.")}</p>}
          {proposal.remaining.length > 0 && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100"><p className="font-semibold">{tr("Осталось без времени", "Still unscheduled")}</p>{proposal.remaining.map((r) => <p key={r.taskId} className="mt-1">{baseline.tasks.find((t) => t.id === r.taskId)?.title} · {r.minutes} {tr("мин", "min")}</p>)}</div>}
          <p className="text-sm text-slate-500">{tr(`После подтверждения будут заменены умные планы только с ${first} по ${shiftISO(first, 6)} для показанных учебных дней.`, `After confirmation, smart plans for the displayed study days from ${first} to ${shiftISO(first, 6)} will be replaced.`)}</p>
          <div className="flex flex-wrap gap-2"><button className={btnPrimary} disabled={!proposal.days.length || proposal.days.some((d) => !d.result.canApply)} onClick={() => {
            try { if (JSON.stringify(app.workspace) !== JSON.stringify(baseline.workspace)) throw new Error(tr("События изменились. Пересчитайте план.", "Events changed. Generate a new plan.")); app.applyWeekPlan(proposal.days, baseline.tasks, baseline.planner); setOpen(false); }
            catch (e) { setError(e instanceof Error ? e.message : tr("Не удалось сохранить", "Could not save")); }
          }}>{tr("Применить неделю", "Apply week")}</button><button className={btnSecondary} onClick={() => setProposal(null)}>{tr("Изменить", "Edit")}</button></div>
        </>}
        {error && <p role="alert" className="text-sm text-rose-500">{error}</p>}
        <button className={btnSecondary} onClick={() => setOpen(false)}>{tr("Отмена", "Cancel")}</button>
      </div>
    </Modal>
  </>;
}
