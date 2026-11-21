"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardTitle, EmptyState, PageHeader } from "@/components/Card";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { TaskForm } from "@/components/TaskForm";
import { SessionForm } from "@/components/SessionForm";
import { useApp } from "@/context/AppProvider";
import { useStudy } from "@/context/StudyProvider";
import { WEEKDAYS_SHORT, monthCells, parseISODate } from "@/lib/dates";
import { formatMinutes, minutesOn } from "@/lib/stats";
import type { Task } from "@/lib/types";
import { btnPrimary, btnSecondary } from "@/lib/ui";
import { SmartPlanner } from "@/components/SmartPlanner";
import type { Language } from "@/lib/smart-planner";
import { CalendarWorkspace, type CalendarView } from "@/components/CalendarWorkspace";
import { WeekPlanner } from "@/components/WeekPlanner";
import { CalendarTransfer } from "@/components/CalendarTransfer";
import { isISODate } from "@/lib/dates";

type Dialog = { kind: "add" } | { kind: "edit"; task: Task } | { kind: "session"; task: Task } | null;

function statusOf(task: Task, today: string, language: Language): { label: string; cls: string } {
  if (language === "en") {
    const st = statusOf(task, today, "ru");
    return { ...st, label: task.done ? "Completed" : task.due < today ? "Overdue" : "In progress" };
  }
  if (task.done) return { label: "Выполнена", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" };
  if (task.due < today) return { label: "Просрочена", cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" };
  return { label: "В процессе", cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" };
}

export default function PlannerPage() {
  const { tasks, toggleTask, deleteTask, today } = useApp();
  const { sessions, addSession } = useStudy();
  const [language, setLanguage] = useState<Language>("ru");
  useEffect(() => { try { if (localStorage.getItem("plos.planner.language") === "en") setLanguage("en"); } catch {} }, []);
  const tr = (ru: string, en: string) => language === "ru" ? ru : en;
  const longDate = (iso: string) => parseISODate(iso).toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", { day: "numeric", month: "long", year: "numeric" });
  const duration = (minutes: number) => language === "ru" ? formatMinutes(minutes) : `${minutes} min`;

  const [selected, setSelected] = useState(today);
  const [view, setView] = useState(() => {
    const d = parseISODate(today);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [dialog, setDialog] = useState<Dialog>(null);
  const [calendarView, setCalendarView] = useState<CalendarView>("week");
  useEffect(() => { const day = new URLSearchParams(window.location.search).get("date"); if (isISODate(day)) { setSelected(day); const d = parseISODate(day); setView({ year: d.getFullYear(), month: d.getMonth() }); setCalendarView("day"); } }, []);

  const cells = useMemo(() => monthCells(view.year, view.month), [view]);

  // Группировка по дате: один проход вместо фильтра на каждую ячейку.
  const byDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      const list = map.get(t.due);
      if (list) list.push(t);
      else map.set(t.due, [t]);
    }
    return map;
  }, [tasks]);

  const monthTitle = new Date(view.year, view.month, 1).toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", { month: "long", year: "numeric" });
  const dayTasks = [...(byDate.get(selected) ?? [])].sort((a, b) => Number(a.done) - Number(b.done) || a.createdAt - b.createdAt);
  const doneCount = dayTasks.filter((t) => t.done).length;
  const studied = minutesOn(sessions, selected);

  function shiftMonth(delta: number) {
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function goToday() {
    const d = parseISODate(today);
    setView({ year: d.getFullYear(), month: d.getMonth() });
    setSelected(today);
  }

  function pick(iso: string, inMonth: boolean) {
    setSelected(iso);
    if (!inMonth) {
      const d = parseISODate(iso);
      setView({ year: d.getFullYear(), month: d.getMonth() });
    }
  }

  function remove(task: Task) {
    if (window.confirm(tr(`Удалить задачу «${task.title}»?`, `Delete task “${task.title}”?`))) deleteTask(task.id);
  }

  const navBtn =
    "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";

  return (
    <div lang={language}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Planner" description={tr("Календарь задач: выбирайте день, добавляйте и отмечайте задачи.", "Your task calendar: choose a day, add tasks and track completion.")} />
        <div className="mb-4 flex rounded-xl border border-slate-200 p-1 dark:border-slate-700" role="group" aria-label="Язык / Language">
          {(["ru", "en"] as const).map((lang) => <button key={lang} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${language === lang ? "bg-indigo-600 text-white" : "text-slate-500 dark:text-slate-300"}`} aria-pressed={language === lang} onClick={() => { setLanguage(lang); try { localStorage.setItem("plos.planner.language", lang); } catch {} }}>{lang.toUpperCase()}</button>)}
        </div>
      </div>
      <div className="mb-4"><CalendarTransfer /></div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label={tr("Вид календаря", "Calendar view")}>{(["month", "week", "day", "agenda"] as CalendarView[]).map((mode, i) => <button key={mode} className={`rounded-lg px-3 py-2 text-sm ${calendarView === mode ? "bg-white font-medium text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-300" : "text-slate-500"}`} aria-pressed={calendarView === mode} onClick={() => setCalendarView(mode)}>{tr(["Месяц", "Неделя", "День", "Список"][i], ["Month", "Week", "Day", "Agenda"][i])}</button>)}</div><WeekPlanner date={selected} language={language} /></div>
      <SmartPlanner date={selected} language={language} compact={calendarView !== "month"} onDateChange={(iso) => pick(iso, false)} />
      {calendarView !== "month" && <CalendarWorkspace date={selected} view={calendarView} language={language} onDateChange={(iso) => pick(iso, false)} />}
      {calendarView === "month" && <div className="grid gap-6 lg:grid-cols-5">
        <Card className="min-w-0 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="min-w-0 truncate text-base font-semibold capitalize text-slate-900 dark:text-slate-100">{monthTitle}</h2>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" className={navBtn} onClick={() => shiftMonth(-1)} aria-label={tr("Предыдущий месяц", "Previous month")}>
                <Icon name="chevronLeft" className="h-4 w-4" />
              </button>
              <button type="button" className={`${btnSecondary} px-3! py-2!`} onClick={goToday}>{tr("Сегодня", "Today")}</button>
              <button type="button" className={navBtn} onClick={() => shiftMonth(1)} aria-label={tr("Следующий месяц", "Next month")}>
                <Icon name="chevronRight" className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-1.5" role="group" aria-label={`${tr("Календарь", "Calendar")}, ${monthTitle}`}>
            {(language === "ru" ? WEEKDAYS_SHORT : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]).map((d) => (
              <div key={d} aria-hidden="true" className="py-1 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
                {d}
              </div>
            ))}
            {cells.map((c) => {
              const list = byDate.get(c.iso) ?? [];
              const open = list.filter((t) => !t.done).length;
              const overdue = open > 0 && c.iso < today;
              const isSel = c.iso === selected;
              const isToday = c.iso === today;
              return (
                <button
                  key={c.iso}
                  type="button"
                  aria-pressed={isSel}
                  aria-current={isToday ? "date" : undefined}
                  aria-label={`${longDate(c.iso)}: ${list.length === 0 ? tr("задач нет", "no tasks") : tr(`задач ${list.length}, невыполненных ${open}`, `${list.length} tasks, ${open} incomplete`)}`}
                  onClick={() => pick(c.iso, c.inMonth)}
                  className={`relative flex min-h-12 min-w-0 flex-col items-center justify-start gap-1 rounded-xl border p-1 pt-1.5 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 sm:min-h-16 ${
                    isSel
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : isToday
                        ? "border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-500/50 dark:bg-indigo-500/10 dark:text-indigo-200"
                        : c.inMonth
                          ? "border-transparent text-slate-800 hover:border-slate-200 hover:bg-slate-50 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                          : "border-transparent text-slate-400 hover:bg-slate-50 dark:text-slate-600 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <span className={isToday ? "font-bold" : ""}>{c.day}</span>
                  {list.length > 0 && (
                    <span
                      className={`flex items-center gap-1 text-[10px] font-medium sm:text-xs ${
                        isSel ? "text-indigo-100" : overdue ? "text-rose-600 dark:text-rose-400" : open === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-indigo-600 dark:text-indigo-300"
                      }`}
                      aria-hidden="true"
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${isSel ? "bg-white" : overdue ? "bg-rose-500" : open === 0 ? "bg-emerald-500" : "bg-indigo-500"}`} />
                      {list.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-indigo-500" />{tr("есть задачи", "has tasks")}</span>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-500" />{tr("просрочено", "overdue")}</span>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />{tr("всё выполнено", "all complete")}</span>
          </p>
        </Card>

        <Card className="min-w-0 lg:col-span-2">
          <CardTitle
            action={
              <button type="button" className={`${btnPrimary} px-3! py-2!`} onClick={() => setDialog({ kind: "add" })}>
                <Icon name="plus" className="h-4 w-4" /> {tr("Задача", "Task")}
              </button>
            }
          >
            <span className="block first-letter:uppercase">{longDate(selected)}</span>
          </CardTitle>
          <p className="-mt-2 mb-3 text-sm text-slate-500 dark:text-slate-400">
            {dayTasks.length === 0 ? tr("Задач нет", "No tasks") : tr(`Выполнено ${doneCount} из ${dayTasks.length}`, `${doneCount} of ${dayTasks.length} complete`)}
            {studied > 0 && <> · {tr("учёба", "study")}: {duration(studied)}</>}
          </p>

          {dayTasks.length === 0 ? (
            <EmptyState>{tr("На этот день задач нет. Нажмите «Задача», чтобы добавить.", "No tasks for this day. Select “Task” to add one.")}</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {dayTasks.map((t) => {
                const st = statusOf(t, today, language);
                return (
                  <li key={t.id} className="flex items-start gap-3 py-3">
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={() => toggleTask(t.id)}
                      aria-label={`${tr("Отметить выполненной", "Mark complete")}: ${t.title}`}
                      className="mt-0.5 h-5 w-5 shrink-0 accent-indigo-600"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`break-words text-sm font-medium ${t.done ? "text-slate-400 line-through dark:text-slate-500" : "text-slate-900 dark:text-slate-100"}`}>
                        {t.title}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>{t.subject || tr("Без предмета", "No subject")}</span>
                        <span className={`rounded-full px-2 py-0.5 font-medium ${st.cls}`}>{st.label}</span>
                      </p>
                      {sessions.some((s) => s.taskId === t.id) && (
                        <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-300">
                          {tr("Учёба", "Study")}: {duration(sessions.filter((s) => s.taskId === t.id).reduce((sum, s) => sum + s.minutes, 0))}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0">
                      <button
                        type="button"
                        disabled={selected > today}
                        onClick={() => setDialog({ kind: "session", task: t })}
                        aria-label={`${tr("Записать занятие по задаче", "Log a session for task")}: ${t.title}`}
                        title={selected > today ? tr("Нельзя записать занятие на будущую дату", "Cannot log future sessions") : tr("Записать занятие", "Log session")}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
                      >
                        <Icon name="journal" className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDialog({ kind: "edit", task: t })}
                        aria-label={`${tr("Изменить задачу", "Edit task")}: ${t.title}`}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800"
                      >
                        <Icon name="edit" className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(t)}
                        aria-label={`${tr("Удалить задачу", "Delete task")}: ${t.title}`}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>}
      {calendarView === "month" && <div className="mt-6"><CalendarWorkspace date={selected} view="month" language={language} onDateChange={(iso) => pick(iso, false)} /></div>}

      <Modal open={dialog?.kind === "add"} onClose={() => setDialog(null)} title={tr("Новая задача", "New task")} closeLabel={tr("Закрыть", "Close")}>
        <TaskForm defaultDue={selected} onDone={() => setDialog(null)} language={language} />
      </Modal>
      <Modal open={dialog?.kind === "edit"} onClose={() => setDialog(null)} title={tr("Изменить задачу", "Edit task")} closeLabel={tr("Закрыть", "Close")}>
        {dialog?.kind === "edit" && <TaskForm key={dialog.task.id} task={dialog.task} onDone={() => setDialog(null)} language={language} />}
      </Modal>
      <Modal open={dialog?.kind === "session"} onClose={() => setDialog(null)} title={tr("Записать занятие по задаче", "Log a study session")} closeLabel={tr("Закрыть", "Close")}>
        {dialog?.kind === "session" && (
          <SessionForm
            key={dialog.task.id}
            initial={{ date: selected, minutes: 30, subject: dialog.task.subject || dialog.task.title, note: "", taskId: dialog.task.id }}
            submitLabel={tr("Добавить в журнал", "Add to journal")}
            language={language}
            onCancel={() => setDialog(null)}
            onSubmit={(values) => { addSession({ ...values, source: "manual" }); setDialog(null); }}
          />
        )}
      </Modal>
    </div>
  );
}
