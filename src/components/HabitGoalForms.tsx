"use client";

import { useId, useState, type FormEvent } from "react";
import { useApp } from "@/context/AppProvider";
import { useStudy } from "@/context/StudyProvider";
import { btnPrimary, btnSecondary, inputCls, labelCls } from "@/lib/ui";
import type { GoalKind, Habit, WeeklyGoal } from "@/lib/types";

export function HabitForm({
  habit, onSubmit, onCancel,
}: { habit?: Habit; onSubmit: (v: { name: string; target: number }) => void; onCancel: () => void }) {
  const uid = useId();
  const [name, setName] = useState(habit?.name ?? "");
  const [target, setTarget] = useState(String(habit?.target ?? 7));
  const [error, setError] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const n = Number(target);
    if (!name.trim()) return setError("Введите название привычки.");
    if (!Number.isInteger(n) || n < 1 || n > 7) return setError("Цель — целое число дней в неделю от 1 до 7.");
    onSubmit({ name: name.trim(), target: n });
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor={`${uid}-name`} className={labelCls}>Название</label>
        <input id={`${uid}-name`} className={inputCls} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Например, чтение 20 минут" />
      </div>
      <div>
        <label htmlFor={`${uid}-target`} className={labelCls}>Сколько дней в неделю</label>
        <input id={`${uid}-target`} type="number" inputMode="numeric" min={1} max={7} className={inputCls} value={target} onChange={(e) => setTarget(e.target.value)} />
      </div>
      {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={btnPrimary}>{habit ? "Сохранить" : "Добавить привычку"}</button>
        <button type="button" className={btnSecondary} onClick={onCancel}>Отмена</button>
      </div>
    </form>
  );
}

const KINDS: { id: GoalKind; label: string; hint: string }[] = [
  { id: "minutes", label: "Учебное время", hint: "считается автоматически из журнала занятий" },
  { id: "sessions", label: "Число занятий", hint: "считается автоматически из журнала занятий" },
  { id: "manual", label: "Своя цель", hint: "прогресс отмечается вручную кнопками + и −" },
];

export type GoalValues = { title: string; kind: GoalKind; target: number; subject: string };

export function GoalForm({
  goal, onSubmit, onCancel,
}: { goal?: WeeklyGoal; onSubmit: (v: GoalValues) => void; onCancel: () => void }) {
  const uid = useId();
  const { tasks } = useApp();
  const { sessions } = useStudy();
  const [title, setTitle] = useState(goal?.title ?? "");
  const [kind, setKind] = useState<GoalKind>(goal?.kind ?? "minutes");
  // Для учебного времени цель вводится в часах, хранится в минутах.
  const [target, setTarget] = useState(goal ? String(goal.kind === "minutes" ? goal.target / 60 : goal.target) : "5");
  const [subject, setSubject] = useState(goal?.subject ?? "");
  const [error, setError] = useState("");
  const subjects = [...new Set([...tasks.map((t) => t.subject), ...sessions.map((s) => s.subject)].map((s) => s.trim()).filter(Boolean))];

  function submit(e: FormEvent) {
    e.preventDefault();
    const raw = Number(target.replace(",", "."));
    if (!title.trim()) return setError("Введите название цели.");
    if (!Number.isFinite(raw) || raw <= 0) return setError("Укажите положительное значение цели.");
    if (kind === "minutes") {
      const minutes = Math.round(raw * 60);
      if (minutes < 1 || minutes > 168 * 60) return setError("Цель по времени — от 1 минуты до 168 часов в неделю.");
      return onSubmit({ title: title.trim(), kind, target: minutes, subject: subject.trim() });
    }
    if (!Number.isInteger(raw) || raw > 1000) return setError("Цель — целое число от 1 до 1000.");
    onSubmit({ title: title.trim(), kind, target: raw, subject: kind === "sessions" ? subject.trim() : "" });
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor={`${uid}-title`} className={labelCls}>Название цели</label>
        <input id={`${uid}-title`} className={inputCls} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Например, 5 часов математики" />
      </div>
      <div>
        <label htmlFor={`${uid}-kind`} className={labelCls}>Тип цели</label>
        <select id={`${uid}-kind`} className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as GoalKind)}>
          {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
        </select>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{KINDS.find((k) => k.id === kind)?.hint}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-target`} className={labelCls}>
            {kind === "minutes" ? "Часов за неделю" : kind === "sessions" ? "Занятий за неделю" : "Повторений за неделю"}
          </label>
          <input
            id={`${uid}-target`}
            type="number"
            inputMode="decimal"
            min={kind === "minutes" ? 0.5 : 1}
            step={kind === "minutes" ? 0.5 : 1}
            className={inputCls}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </div>
        {kind !== "manual" && (
          <div>
            <label htmlFor={`${uid}-subject`} className={labelCls}>Только предмет</label>
            <input id={`${uid}-subject`} list={`${uid}-subjects`} className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Необязательно" />
            <datalist id={`${uid}-subjects`}>{subjects.map((s) => <option key={s} value={s} />)}</datalist>
          </div>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={btnPrimary}>{goal ? "Сохранить" : "Добавить цель"}</button>
        <button type="button" className={btnSecondary} onClick={onCancel}>Отмена</button>
      </div>
    </form>
  );
}
