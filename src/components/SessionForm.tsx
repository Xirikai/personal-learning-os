"use client";

import { useId, useState, type FormEvent } from "react";
import { useApp } from "@/context/AppProvider";
import { useStudy } from "@/context/StudyProvider";
import { isISODate } from "@/lib/dates";
import { btnPrimary, btnSecondary, inputCls, labelCls } from "@/lib/ui";
import type { Language } from "@/lib/smart-planner";

export type SessionValues = { date: string; minutes: number; subject: string; note: string; taskId: string | null };

type Props = {
  initial: SessionValues;
  submitLabel: string;
  onSubmit: (values: SessionValues) => void;
  onCancel?: () => void;
  cancelLabel?: string;
  /** Для записи, завершающей таймер, дату менять нельзя. */
  lockDate?: boolean;
  language?: Language;
};

/** Форма записи занятия: используется в журнале (создание/правка) и при завершении Pomodoro. */
export function SessionForm({ initial, submitLabel, onSubmit, onCancel, cancelLabel, lockDate, language = "ru" }: Props) {
  const tr = (ru: string, en: string) => language === "ru" ? ru : en;
  const { tasks, today } = useApp();
  const { sessions } = useStudy();
  const uid = useId();
  const [date, setDate] = useState(initial.date);
  const [minutes, setMinutes] = useState(String(initial.minutes));
  const [subject, setSubject] = useState(initial.subject);
  const [note, setNote] = useState(initial.note);
  const [taskId, setTaskId] = useState(initial.taskId ?? "");
  const [error, setError] = useState("");

  // Показываем невыполненные задачи и ту, к которой запись уже привязана.
  const selectable = tasks.filter((t) => !t.done || t.id === initial.taskId);
  const subjects = [...new Set([...tasks.map((t) => t.subject), ...sessions.map((s) => s.subject)].map((s) => s.trim()).filter(Boolean))];

  function onTaskChange(id: string) {
    setTaskId(id);
    const t = tasks.find((x) => x.id === id);
    if (t && !subject.trim()) setSubject(t.subject || t.title);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const mins = Number(minutes);
    if (!isISODate(date)) return setError(tr("Укажите дату занятия.", "Enter a study date."));
    if (date > today) return setError(tr("Дата занятия не может быть в будущем.", "Study dates cannot be in the future."));
    if (!Number.isInteger(mins) || mins < 1 || mins > 1440) return setError(tr("Продолжительность — целое число минут от 1 до 1440.", "Duration must be a whole number from 1 to 1440 minutes."));
    setError("");
    onSubmit({ date, minutes: mins, subject: subject.trim(), note: note.trim(), taskId: taskId || null });
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-date`} className={labelCls}>{tr("Дата", "Date")}</label>
          <input id={`${uid}-date`} type="date" className={inputCls} value={date} max={today} disabled={lockDate} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label htmlFor={`${uid}-min`} className={labelCls}>{tr("Продолжительность, мин", "Duration, min")}</label>
          <input id={`${uid}-min`} type="number" inputMode="numeric" min={1} max={1440} step={1} className={inputCls} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </div>
      </div>
      <div>
        <label htmlFor={`${uid}-subject`} className={labelCls}>{tr("Предмет или тема", "Subject or topic")}</label>
        <input id={`${uid}-subject`} list={`${uid}-subjects`} className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={tr("Например, Математический анализ", "For example, Calculus")} />
        <datalist id={`${uid}-subjects`}>
          {subjects.map((s) => <option key={s} value={s} />)}
        </datalist>
      </div>
      <div>
        <label htmlFor={`${uid}-task`} className={labelCls}>{tr("Связанная задача", "Linked task")}</label>
        <select id={`${uid}-task`} className={inputCls} value={taskId} onChange={(e) => onTaskChange(e.target.value)}>
          <option value="">{tr("Без задачи", "No task")}</option>
          {selectable.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          {taskId && !tasks.some((t) => t.id === taskId) && <option value={taskId}>{tr("Задача удалена", "Deleted task")}</option>}
        </select>
      </div>
      <div>
        <label htmlFor={`${uid}-note`} className={labelCls}>{tr("Заметка о результате", "Outcome note")}</label>
        <textarea id={`${uid}-note`} rows={3} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr("Что удалось сделать?", "What did you accomplish?")} />
      </div>
      {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={btnPrimary}>{submitLabel}</button>
        {onCancel && <button type="button" className={btnSecondary} onClick={onCancel}>{cancelLabel ?? tr("Отмена", "Cancel")}</button>}
      </div>
    </form>
  );
}
