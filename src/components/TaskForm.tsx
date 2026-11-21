"use client";

import { useState, type FormEvent } from "react";
import { useApp } from "@/context/AppProvider";
import { btnPrimary, btnSecondary, inputCls, labelCls } from "@/lib/ui";
import { isISODate, makeId } from "@/lib/dates";
import type { Task } from "@/lib/types";
import { taskDefaults, isLocalDateTime, type Language } from "@/lib/smart-planner";
import { messages } from "@/lib/planner-i18n";

type Props = {
  onDone?: () => void;
  /** Если передана задача — форма работает как редактирование. */
  task?: Task;
  /** Срок по умолчанию для новой задачи (например, выбранный день в календаре). */
  defaultDue?: string;
  language?: Language;
};

export function TaskForm({ onDone, task, defaultDue, language = "ru" }: Props) {
  const { addTask, updateTask, today } = useApp();
  const editing = Boolean(task);
  const [title, setTitle] = useState(task?.title ?? "");
  const [subject, setSubject] = useState(task?.subject ?? "");
  const [due, setDue] = useState(task?.due ?? defaultDue ?? today);
  const [error, setError] = useState("");
  const defaults = task ? taskDefaults(task) : { durationMinutes: 30, priority: "medium" as const, mandatory: false, splittable: true };
  const [durationMinutes, setDuration] = useState(defaults.durationMinutes);
  const [priority, setPriority] = useState<Task["priority"]>(defaults.priority);
  const [mandatory, setMandatory] = useState(defaults.mandatory);
  const [splittable, setSplittable] = useState(defaults.splittable);
  const [fixedStart, setFixedStart] = useState(task?.fixedStart ?? "");
  const [steps, setSteps] = useState(task?.steps ?? []);
  const [stepTitle, setStepTitle] = useState("");
  const m = messages[language];
  const tr = (ru: string, en: string) => language === "ru" ? ru : en;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError(tr("Введите название задачи.", "Enter a task title."));
      return;
    }
    if (!isISODate(due)) {
      setError(tr("Укажите срок выполнения.", "Enter a deadline."));
      return;
    }
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440 || (fixedStart && !isLocalDateTime(fixedStart))) {
      setError(tr("Проверьте длительность (1–1440 минут) и время занятия.", "Check the duration (1–1440 minutes) and fixed time.")); return;
    }
    const values = { title: title.trim(), subject: subject.trim(), due, durationMinutes, priority, mandatory, splittable, fixedStart: fixedStart || undefined, steps };
    if (task) updateTask(task.id, values);
    else addTask(values);
    if (!editing) {
      setTitle("");
      setSubject("");
      setSteps([]); setStepTitle("");
    }
    setError("");
    onDone?.();
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="task-title" className={labelCls}>{m.name}</label>
        <input id="task-title" className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tr("Например, решить задачи по алгебре", "For example, practice algebra")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="task-subject" className={labelCls}>{tr("Предмет", "Subject")}</label>
          <input id="task-subject" className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={tr("Необязательно", "Optional")} />
        </div>
        <div>
          <label htmlFor="task-due" className={labelCls}>{m.deadline}</label>
          <input id="task-due" type="date" className={inputCls} value={due} onInput={(e) => setDue(e.currentTarget.value)} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelCls}>{m.duration}<input className={`${inputCls} mt-1.5`} type="number" min="1" max="1440" value={Number.isNaN(durationMinutes) ? "" : durationMinutes} onChange={(e) => setDuration(e.target.valueAsNumber)} /></label>
        <label className={labelCls}>{m.priority}<select className={`${inputCls} mt-1.5`} value={priority} onChange={(e) => setPriority(e.target.value as Task["priority"])}><option value="high">{m.priorityHigh}</option><option value="medium">{m.priorityMedium}</option><option value="low">{m.priorityLow}</option></select></label>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={mandatory} onChange={(e) => setMandatory(e.target.checked)} className="h-4 w-4 accent-indigo-600" />{m.mandatory}</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={splittable} onChange={(e) => setSplittable(e.target.checked)} className="h-4 w-4 accent-indigo-600" />{m.split}</label>
      </div>
      <label className={labelCls}>{m.fixedTime} ({tr("необязательно", "optional")})<input className={`${inputCls} mt-1.5`} type="datetime-local" value={fixedStart} onInput={(e) => setFixedStart(e.currentTarget.value)} /></label>
      <fieldset className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><legend className="px-1 text-sm font-medium">{tr("Шаги задачи", "Task steps")}</legend>
        <div className="space-y-2">{steps.map((step) => <div key={step.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={step.done} onChange={(e) => setSteps(steps.map((s) => s.id === step.id ? { ...s, done: e.target.checked } : s))} /><span className="min-w-0 flex-1 break-words">{step.title}</span><button type="button" className="px-2 text-slate-500" aria-label={`${tr("Убрать шаг", "Remove step")}: ${step.title}`} onClick={() => setSteps(steps.filter((s) => s.id !== step.id))}>×</button></div>)}</div>
        <div className="mt-2 flex gap-2"><input aria-label={tr("Новый шаг", "New step")} className={inputCls} value={stepTitle} onChange={(e) => setStepTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (stepTitle.trim()) { setSteps([...steps, { id: makeId(), title: stepTitle.trim(), done: false }]); setStepTitle(""); } } }} /><button type="button" className={btnSecondary} disabled={!stepTitle.trim()} onClick={() => { setSteps([...steps, { id: makeId(), title: stepTitle.trim(), done: false }]); setStepTitle(""); }}>+</button></div>
      </fieldset>
      {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={btnPrimary}>{editing ? tr("Сохранить", "Save") : tr("Добавить задачу", "Add task")}</button>
        {editing && onDone && (
          <button type="button" className={btnSecondary} onClick={onDone}>{m.cancel}</button>
        )}
      </div>
    </form>
  );
}
