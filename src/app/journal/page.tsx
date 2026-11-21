"use client";

import { useMemo, useState } from "react";
import { Card, CardTitle, EmptyState } from "@/components/Card";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { WeekBars } from "@/components/Progress";
import { SessionForm } from "@/components/SessionForm";
import { useApp } from "@/context/AppProvider";
import { useStudy } from "@/context/StudyProvider";
import { formatLongDate, formatWeekRange, shiftISO, weekStartISO } from "@/lib/dates";
import { formatMinutes, minutesInWeek, minutesOn, sessionsInWeek, totalsBySubject, weekSeries } from "@/lib/stats";
import type { StudySession } from "@/lib/types";
import { btnPrimary, btnSecondary, inputCls } from "@/lib/ui";
import { downloadText } from "@/lib/workspace";
import { csvCell } from "@/lib/ical";

type Dialog = { kind: "add" } | { kind: "edit"; session: StudySession } | null;
const PAGE_DAYS = 14;

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-50">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </Card>
  );
}

export default function JournalPage() {
  const { tasks, today } = useApp();
  const { sessions, addSession, updateSession, deleteSession } = useStudy();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [query, setQuery] = useState("");
  const [weekDay, setWeekDay] = useState(today);
  const [visibleDays, setVisibleDays] = useState(PAGE_DAYS);

  const weekStart = weekStartISO(weekDay);
  const isCurrentWeek = weekStart === weekStartISO(today);
  const weekList = sessionsInWeek(sessions, weekStart);
  const weekTotal = minutesInWeek(sessions, weekStart);
  const subjects = totalsBySubject(weekList);
  const taskTitle = (id: string | null) => (id ? (tasks.find((t) => t.id === id)?.title ?? "Задача удалена") : null);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = sessions.filter(
      (s) => !q || s.subject.toLowerCase().includes(q) || s.note.toLowerCase().includes(q) ||
        (s.taskId !== null && (tasks.find((t) => t.id === s.taskId)?.title ?? "").toLowerCase().includes(q)),
    );
    const map = new Map<string, StudySession[]>();
    for (const s of filtered) {
      const list = map.get(s.date);
      if (list) list.push(s);
      else map.set(s.date, [s]);
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, list]) => ({ date, list: list.sort((a, b) => b.createdAt - a.createdAt) }));
  }, [sessions, tasks, query]);

  function remove(s: StudySession) {
    if (window.confirm(`Удалить запись «${s.subject || "Без предмета"}» (${formatMinutes(s.minutes)})?`)) deleteSession(s.id);
  }

  const navBtn =
    "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";

  return (
    <div className="space-y-6">
      <button className={btnSecondary} onClick={() => downloadText("study-journal.csv", "\uFEFF" + [["Дата", "Минуты", "Предмет", "Заметка", "ID задачи"], ...sessions.map((s) => [s.date, s.minutes, s.subject, s.note, s.taskId ?? ""])].map((row) => row.map(csvCell).join(";")).join("\r\n"), "text/csv;charset=utf-8")}>Скачать журнал .csv</button>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Журнал занятий</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Фактически потраченное учебное время: записи таймера и ручные.</p>
        </div>
        <button type="button" className={btnPrimary} onClick={() => setDialog({ kind: "add" })}>
          <Icon name="plus" className="h-4 w-4" /> Запись
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Сегодня" value={formatMinutes(minutesOn(sessions, today))} />
        <Stat label="Эта неделя" value={formatMinutes(minutesInWeek(sessions, weekStartISO(today)))} />
        <Stat label="Всего записей" value={String(sessions.length)} hint={sessions.length > 0 ? `всего ${formatMinutes(sessions.reduce((s, x) => s + x.minutes, 0))}` : undefined} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="min-w-0 lg:col-span-3">
          <CardTitle
            action={
              <div className="flex items-center gap-1.5">
                <button type="button" className={navBtn} onClick={() => setWeekDay(shiftISO(weekStart, -7))} aria-label="Предыдущая неделя">
                  <Icon name="chevronLeft" className="h-4 w-4" />
                </button>
                {!isCurrentWeek && (
                  <button type="button" className={`${btnSecondary} px-3! py-1.5!`} onClick={() => setWeekDay(today)}>Сегодня</button>
                )}
                <button type="button" className={navBtn} onClick={() => setWeekDay(shiftISO(weekStart, 7))} aria-label="Следующая неделя">
                  <Icon name="chevronRight" className="h-4 w-4" />
                </button>
              </div>
            }
          >
            Неделя {formatWeekRange(weekStart)}
          </CardTitle>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Итого: <b className="text-slate-900 dark:text-slate-100">{formatMinutes(weekTotal)}</b> · записей: {weekList.length}
          </p>
          <WeekBars series={weekSeries(sessions, weekStart)} today={today} />
        </Card>

        <Card className="min-w-0 lg:col-span-2">
          <CardTitle>По предметам за неделю</CardTitle>
          {subjects.length === 0 ? (
            <EmptyState>За эту неделю записей нет.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {subjects.map((s) => (
                <li key={s.subject} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{s.subject}</span>
                  <span className="shrink-0 font-medium">{formatMinutes(s.minutes)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardTitle>История</CardTitle>
        <input
          type="search"
          aria-label="Поиск по журналу"
          placeholder="Поиск по предмету, заметке или задаче"
          className={`${inputCls} mb-4`}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisibleDays(PAGE_DAYS);
          }}
        />
        {groups.length === 0 ? (
          <EmptyState>
            {sessions.length === 0
              ? "Записей пока нет. Добавьте занятие кнопкой «Запись» или завершите фокус-сессию на странице «Таймер»."
              : "Ничего не найдено."}
          </EmptyState>
        ) : (
          <div className="space-y-5">
            {groups.slice(0, visibleDays).map((g) => (
              <section key={g.date} aria-label={formatLongDate(g.date)}>
                <h3 className="mb-1 flex items-center justify-between gap-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <span className="first-letter:uppercase">{g.date === today ? "Сегодня" : formatLongDate(g.date)}</span>
                  <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                    за день: {formatMinutes(minutesOn(sessions, g.date))}
                  </span>
                </h3>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {g.list.map((s) => {
                    const task = taskTitle(s.taskId);
                    return (
                      <li key={s.id} className="flex items-start gap-3 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-medium text-slate-900 dark:text-slate-100">
                            {s.subject || "Без предмета"}
                            {s.source === "pomodoro" && (
                              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">Pomodoro</span>
                            )}
                          </p>
                          {task && <p className="mt-0.5 break-words text-xs text-slate-500 dark:text-slate-400">Задача: {task}</p>}
                          {s.note && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-400">{s.note}</p>}
                        </div>
                        <span className="shrink-0 text-sm font-medium tabular-nums">{formatMinutes(s.minutes)}</span>
                        <div className="flex shrink-0">
                          <button type="button" onClick={() => setDialog({ kind: "edit", session: s })} aria-label={`Изменить запись: ${s.subject || "Без предмета"}, ${formatMinutes(s.minutes)}`} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800">
                            <Icon name="edit" className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => remove(s)} aria-label={`Удалить запись: ${s.subject || "Без предмета"}, ${formatMinutes(s.minutes)}`} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800">
                            <Icon name="trash" className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            {groups.length > visibleDays && (
              <button type="button" className={btnSecondary} onClick={() => setVisibleDays((n) => n + PAGE_DAYS)}>
                Показать ещё
              </button>
            )}
          </div>
        )}
      </Card>

      <Modal open={dialog?.kind === "add"} onClose={() => setDialog(null)} title="Новая запись">
        <SessionForm
          initial={{ date: today, minutes: 30, subject: "", note: "", taskId: null }}
          submitLabel="Добавить запись"
          onCancel={() => setDialog(null)}
          onSubmit={(v) => {
            addSession({ ...v, source: "manual" });
            setDialog(null);
          }}
        />
      </Modal>
      <Modal open={dialog?.kind === "edit"} onClose={() => setDialog(null)} title="Изменить запись">
        {dialog?.kind === "edit" && (
          <SessionForm
            key={dialog.session.id}
            initial={dialog.session}
            submitLabel="Сохранить"
            onCancel={() => setDialog(null)}
            onSubmit={(v) => {
              updateSession(dialog.session.id, v);
              setDialog(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
