"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardTitle, EmptyState } from "@/components/Card";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { NoteCard } from "@/components/NoteCard";
import { NoteForm } from "@/components/NoteForm";
import { ProgressBar, WeekBars } from "@/components/Progress";
import { TaskForm } from "@/components/TaskForm";
import { TaskList } from "@/components/TaskList";
import { useApp } from "@/context/AppProvider";
import { useStudy } from "@/context/StudyProvider";
import { formatWeekRange, weekStartISO } from "@/lib/dates";
import {
  formatGoalValue, formatMinutes, goalProgress, goalUnit, habitStreak, habitSummary, habitWeekDone,
  minutesInWeek, minutesOn, sessionsInWeek, weekSeries,
} from "@/lib/stats";
import { btnPrimary, btnSecondary } from "@/lib/ui";
import { TodayBrief } from "@/components/LearningAnalytics";

function Stat({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: "warn" }) {
  return (
    <Card>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${tone === "warn" && Number(value) > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-50"}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </Card>
  );
}

const linkCls = "text-sm font-medium text-indigo-600 dark:text-indigo-300";

export default function DashboardPage() {
  const { tasks, notes, today } = useApp();
  const { sessions, habits, goals } = useStudy();
  const [modal, setModal] = useState<"task" | "note" | null>(null);

  const now = new Date();
  const h = now.getHours();
  const greeting = h < 5 ? "Доброй ночи" : h < 12 ? "Доброе утро" : h < 18 ? "Добрый день" : "Добрый вечер";
  const dateLabel = now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // Задачи
  const open = tasks.filter((t) => !t.done);
  const dueToday = open.filter((t) => t.due === today).length;
  const overdue = open.filter((t) => t.due < today).length;
  const doneCount = tasks.length - open.length;
  const percent = tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100);
  const urgent = open.filter((t) => t.due <= today).sort((a, b) => a.due.localeCompare(b.due));
  const deadlines = open.filter((t) => t.due > today).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 5);
  const recentNotes = [...notes].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);

  // Учёба, цели, привычки — всё считается из сохранённых данных
  const weekStart = weekStartISO(today);
  const weekGoals = goals.filter((g) => g.weekStart === weekStart);
  const weekSessions = sessionsInWeek(sessions, weekStart);
  const hs = habitSummary(habits, today, today);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{greeting}!</h1>
          <p className="mt-1 text-sm capitalize text-slate-500 dark:text-slate-400">{dateLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/timer" className={btnPrimary}>
            <Icon name="timer" className="h-4 w-4" /> Таймер
          </Link>
          <button type="button" className={btnSecondary} onClick={() => setModal("task")}>
            <Icon name="plus" className="h-4 w-4" /> Задача
          </button>
          <button type="button" className={btnSecondary} onClick={() => setModal("note")}>
            <Icon name="plus" className="h-4 w-4" /> Заметка
          </button>
        </div>
      </header>

      <TodayBrief />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="На сегодня" value={dueToday} />
        <Stat label="Просрочено" value={overdue} tone="warn" />
        <Stat label="Активных задач" value={open.length} />
        <Stat label="Учёба сегодня" value={formatMinutes(minutesOn(sessions, today))} />
        <Stat label="Учёба за неделю" value={formatMinutes(minutesInWeek(sessions, weekStart))} hint={formatWeekRange(weekStart)} />
        <Stat label="Учебных сессий" value={sessions.length} hint={`за неделю: ${weekSessions.length}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardTitle>Учебный прогресс</CardTitle>
          <p className="text-4xl font-bold">{percent}%</p>
          <div className="mt-3">
            <ProgressBar value={doneCount} max={tasks.length} label="Доля выполненных задач" />
          </div>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Выполнено {doneCount} из {tasks.length}
          </p>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle action={<Link href="/planner" className={linkCls}>Календарь</Link>}>Сегодня и просрочено</CardTitle>
          <TaskList tasks={urgent} emptyText="На сегодня и просроченных задач нет." />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle action={<Link href="/studyos" className={linkCls}>Все задачи</Link>}>Ближайшие дедлайны</CardTitle>
          <TaskList tasks={deadlines} emptyText="Предстоящих дедлайнов нет. Добавьте задачу кнопкой «Задача»." />
        </Card>

        <Card>
          <CardTitle action={<Link href="/journal" className={linkCls}>Журнал</Link>}>Учебное время за неделю</CardTitle>
          <WeekBars series={weekSeries(sessions, today)} today={today} />
          {sessions.length === 0 && (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Данных пока нет — запустите <Link href="/timer" className={linkCls}>таймер</Link> или добавьте запись в журнал.
            </p>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle action={<Link href="/habits" className={linkCls}>Все цели</Link>}>Цели недели</CardTitle>
          {weekGoals.length === 0 ? (
            <EmptyState>На эту неделю целей нет. <Link href="/habits" className={linkCls}>Поставить цель</Link></EmptyState>
          ) : (
            <ul className="space-y-4">
              {weekGoals.slice(0, 5).map((g) => {
                const p = goalProgress(g, sessions);
                return (
                  <li key={g.id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate font-medium">{g.title}</span>
                      <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                        {formatGoalValue(g, p.current)} / {formatGoalValue(g, p.target)} {goalUnit(g)}
                      </span>
                    </div>
                    <ProgressBar value={p.current} max={p.target} label={`Прогресс цели «${g.title}»`} tone={p.done ? "emerald" : "indigo"} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle action={<Link href="/habits" className={linkCls}>Все привычки</Link>}>Привычки</CardTitle>
          {habits.length === 0 ? (
            <EmptyState>Привычек пока нет. <Link href="/habits" className={linkCls}>Добавить привычку</Link></EmptyState>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold">{hs.doneToday} из {hs.total}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">отмечено сегодня</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{hs.percent}%</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">к цели недели ({hs.weekDone}/{hs.weekPossible})</p>
                </div>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {habits.slice(0, 4).map((hb) => {
                  const streak = habitStreak(hb, today);
                  return (
                    <li key={hb.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${hb.checks.includes(today) ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} aria-hidden="true" />
                        <span className="min-w-0 truncate">{hb.name}</span>
                      </span>
                      <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                        {habitWeekDone(hb, today)}/{hb.target}{streak > 1 ? ` · серия ${streak}` : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card>
      </div>

      <Card>
        <CardTitle action={<Link href="/vault" className={linkCls}>Все заметки</Link>}>Последние заметки</CardTitle>
        {recentNotes.length === 0 ? (
          <EmptyState>Заметок пока нет. Создайте первую кнопкой «Заметка».</EmptyState>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {recentNotes.map((n) => <NoteCard key={n.id} note={n} showDelete={false} />)}
          </div>
        )}
      </Card>

      <Modal open={modal === "task"} onClose={() => setModal(null)} title="Новая задача">
        <TaskForm onDone={() => setModal(null)} />
      </Modal>
      <Modal open={modal === "note"} onClose={() => setModal(null)} title="Новая заметка">
        <NoteForm onDone={() => setModal(null)} />
      </Modal>
    </div>
  );
}
