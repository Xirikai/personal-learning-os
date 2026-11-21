"use client";

import { useState } from "react";
import { Card, CardTitle, EmptyState, PageHeader } from "@/components/Card";
import { GoalForm, HabitForm } from "@/components/HabitGoalForms";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { ProgressBar } from "@/components/Progress";
import { useApp } from "@/context/AppProvider";
import { useStudy } from "@/context/StudyProvider";
import { WEEKDAYS_SHORT, formatLongDate, formatWeekRange, shiftISO, weekDatesISO, weekStartISO } from "@/lib/dates";
import { formatGoalValue, formatMinutes, goalProgress, goalUnit, habitStreak, habitWeekDone } from "@/lib/stats";
import type { Habit, WeeklyGoal } from "@/lib/types";
import { btnPrimary, btnSecondary } from "@/lib/ui";

type Dialog =
  | { kind: "habit-add" } | { kind: "habit-edit"; habit: Habit }
  | { kind: "goal-add" } | { kind: "goal-edit"; goal: WeeklyGoal }
  | null;

const iconBtn = "rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800";

export default function HabitsPage() {
  const { today } = useApp();
  const study = useStudy();
  const { habits, goals, sessions } = study;
  const [weekDay, setWeekDay] = useState(today);
  const [dialog, setDialog] = useState<Dialog>(null);

  const weekStart = weekStartISO(weekDay);
  const days = weekDatesISO(weekDay);
  const isCurrent = weekStart === weekStartISO(today);
  const weekGoals = goals.filter((g) => g.weekStart === weekStart);
  const prevGoals = goals.filter((g) => g.weekStart === shiftISO(weekStart, -7));

  function copyPrevGoals() {
    for (const g of prevGoals.filter((g) => !weekGoals.some((old) => old.title === g.title && old.kind === g.kind && old.subject === g.subject))) {
      study.addGoal({ title: g.title, kind: g.kind, target: g.target, weekStart, subject: g.subject });
    }
  }
  function removeHabit(h: Habit) {
    if (window.confirm(`Удалить привычку «${h.name}» вместе со всеми отметками?`)) study.deleteHabit(h.id);
  }
  function removeGoal(g: WeeklyGoal) {
    if (window.confirm(`Удалить цель «${g.title}»?`)) study.deleteGoal(g.id);
  }

  const navBtn =
    "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title="Привычки и цели" description="Отмечайте повторяющиеся дела и следите за недельными целями." />
        <div className="mb-6 flex items-center gap-2">
          <button type="button" className={navBtn} onClick={() => setWeekDay(shiftISO(weekStart, -7))} aria-label="Предыдущая неделя">
            <Icon name="chevronLeft" className="h-4 w-4" />
          </button>
          <button type="button" className={`${btnSecondary} px-3! py-2!`} onClick={() => setWeekDay(today)} disabled={isCurrent}>
            {formatWeekRange(weekStart)}
          </button>
          <button type="button" className={navBtn} onClick={() => setWeekDay(shiftISO(weekStart, 7))} aria-label="Следующая неделя">
            <Icon name="chevronRight" className="h-4 w-4" />
          </button>
        </div>
      </header>

      <Card><CardTitle>Готовые привычки</CardTitle><div className="flex flex-wrap gap-2">{[{ name: "Читать 20 минут", target: 5 }, { name: "Повторять карточки", target: 5 }, { name: "Двигаться и отдыхать", target: 7 }].map((template) => <button key={template.name} className={btnSecondary} disabled={habits.some((h) => h.name === template.name)} onClick={() => study.addHabit(template)}>+ {template.name}</button>)}</div><p className="mt-3 text-sm text-slate-500">Шаблон добавляется один раз. Название и цель можно изменить.</p></Card>
      <Card>
        <CardTitle
          action={
            <button type="button" className={`${btnPrimary} px-3! py-2!`} onClick={() => setDialog({ kind: "habit-add" })}>
              <Icon name="plus" className="h-4 w-4" /> Привычка
            </button>
          }
        >
          Привычки
        </CardTitle>
        {habits.length === 0 ? (
          <EmptyState>Привычек пока нет. Добавьте первую кнопкой «Привычка».</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {habits.map((h) => {
              const done = habitWeekDone(h, weekDay);
              const streak = habitStreak(h, today);
              return (
                <li key={h.id} className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-slate-900 dark:text-slate-100">{h.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        За неделю: {done} из {h.target}
                        {done >= h.target && <span className="ml-1 font-medium text-emerald-600 dark:text-emerald-400">· цель достигнута</span>}
                        {streak > 0 && <> · серия: {streak} дн.</>}
                      </p>
                    </div>
                    <div className="flex shrink-0">
                      <button type="button" className={`${iconBtn} hover:text-indigo-600`} onClick={() => setDialog({ kind: "habit-edit", habit: h })} aria-label={`Изменить привычку: ${h.name}`}>
                        <Icon name="edit" className="h-4 w-4" />
                      </button>
                      <button type="button" className={`${iconBtn} hover:text-rose-600`} onClick={() => removeHabit(h)} aria-label={`Удалить привычку: ${h.name}`}>
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-7 gap-1.5 sm:gap-2">
                    {days.map((d, i) => {
                      const checked = h.checks.includes(d);
                      const future = d > today;
                      return (
                        <button
                          key={d}
                          type="button"
                          disabled={future}
                          aria-pressed={checked}
                          aria-label={`${h.name}: ${formatLongDate(d)}${checked ? ", выполнено" : ""}`}
                          onClick={() => study.toggleHabitCheck(h.id, d)}
                          className={`flex min-w-0 flex-col items-center gap-0.5 rounded-xl border py-2 text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-40 ${
                            checked
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : d === today
                                ? "border-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 dark:border-indigo-500/50 dark:bg-indigo-500/10 dark:text-indigo-200"
                                : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          }`}
                        >
                          <span className="font-medium">{WEEKDAYS_SHORT[i]}</span>
                          {checked ? <Icon name="check" className="h-3.5 w-3.5" /> : <span className="opacity-70">{Number(d.slice(8))}</span>}
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardTitle
          action={
            <button type="button" className={`${btnPrimary} px-3! py-2!`} onClick={() => setDialog({ kind: "goal-add" })}>
              <Icon name="plus" className="h-4 w-4" /> Цель
            </button>
          }
        >
          Цели на неделю · {formatWeekRange(weekStart)}
        </CardTitle>
        {weekGoals.length === 0 ? (
          <div className="space-y-3">
            <EmptyState>На эту неделю целей нет. Добавьте цель, например «5 часов математики».</EmptyState>
            {prevGoals.length > 0 && (
              <button type="button" className={btnSecondary} onClick={copyPrevGoals}>
                Скопировать цели прошлой недели ({prevGoals.length})
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {weekGoals.map((g) => {
              const p = goalProgress(g, sessions);
              const unit = goalUnit(g);
              return (
                <li key={g.id} className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-slate-900 dark:text-slate-100">{g.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {g.kind === "manual" ? "вручную" : "из журнала"}
                        {g.subject && <> · {g.subject}</>}
                      </p>
                    </div>
                    <div className="flex shrink-0">
                      <button type="button" className={`${iconBtn} hover:text-indigo-600`} onClick={() => setDialog({ kind: "goal-edit", goal: g })} aria-label={`Изменить цель: ${g.title}`}>
                        <Icon name="edit" className="h-4 w-4" />
                      </button>
                      <button type="button" className={`${iconBtn} hover:text-rose-600`} onClick={() => removeGoal(g)} aria-label={`Удалить цель: ${g.title}`}>
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <ProgressBar value={p.current} max={p.target} label={`Прогресс цели «${g.title}»`} tone={p.done ? "emerald" : "indigo"} />
                    </div>
                    {g.kind === "manual" && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button type="button" className={`${btnSecondary} h-8! w-8! p-0!`} onClick={() => study.adjustGoalProgress(g.id, -1)} disabled={g.progress <= 0} aria-label={`Уменьшить прогресс: ${g.title}`}>−</button>
                        <button type="button" className={`${btnSecondary} h-8! w-8! p-0!`} onClick={() => study.adjustGoalProgress(g.id, 1)} aria-label={`Увеличить прогресс: ${g.title}`}>+</button>
                      </div>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {formatGoalValue(g, p.current)} из {formatGoalValue(g, p.target)} {unit} · {p.percent}%
                    {p.done ? (
                      <span className="ml-1 font-medium text-emerald-600 dark:text-emerald-400">· цель выполнена</span>
                    ) : (
                      <> · осталось {g.kind === "minutes" ? formatMinutes(p.remaining) : `${p.remaining} ${unit}`}</>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Modal open={dialog?.kind === "habit-add"} onClose={() => setDialog(null)} title="Новая привычка">
        <HabitForm onCancel={() => setDialog(null)} onSubmit={(v) => { study.addHabit(v); setDialog(null); }} />
      </Modal>
      <Modal open={dialog?.kind === "habit-edit"} onClose={() => setDialog(null)} title="Изменить привычку">
        {dialog?.kind === "habit-edit" && (
          <HabitForm key={dialog.habit.id} habit={dialog.habit} onCancel={() => setDialog(null)} onSubmit={(v) => { study.updateHabit(dialog.habit.id, v); setDialog(null); }} />
        )}
      </Modal>
      <Modal open={dialog?.kind === "goal-add"} onClose={() => setDialog(null)} title="Новая цель на неделю">
        <GoalForm onCancel={() => setDialog(null)} onSubmit={(v) => { study.addGoal({ ...v, weekStart }); setDialog(null); }} />
      </Modal>
      <Modal open={dialog?.kind === "goal-edit"} onClose={() => setDialog(null)} title="Изменить цель">
        {dialog?.kind === "goal-edit" && (
          <GoalForm key={dialog.goal.id} goal={dialog.goal} onCancel={() => setDialog(null)} onSubmit={(v) => { study.updateGoal(dialog.goal.id, v); setDialog(null); }} />
        )}
      </Modal>
    </div>
  );
}
