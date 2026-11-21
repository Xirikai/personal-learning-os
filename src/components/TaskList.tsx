"use client";

import { useApp } from "@/context/AppProvider";
import { formatDue } from "@/lib/dates";
import type { Task } from "@/lib/types";
import { EmptyState } from "./Card";
import { Icon } from "./Icon";
import { useState } from "react";
import { Modal } from "./Modal";
import { TaskForm } from "./TaskForm";
import Link from "next/link";

export function TaskList({ tasks, emptyText }: { tasks: Task[]; emptyText: string }) {
  const { toggleTask, deleteTask, updateTask, today } = useApp();
  const [editing, setEditing] = useState<Task | null>(null);
  if (tasks.length === 0) return <EmptyState>{emptyText}</EmptyState>;

  return (
    <><ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {tasks.map((t) => {
        const due = formatDue(t.due, today);
        return (
          <li key={t.id} className="flex items-center gap-3 py-3">
            <input
              type="checkbox"
              checked={t.done}
              onChange={() => toggleTask(t.id)}
              aria-label={`Отметить выполненной: ${t.title}`}
              className="h-5 w-5 shrink-0 accent-indigo-600"
            />
            <div className="min-w-0 flex-1">
              <p className={`break-words text-sm font-medium ${t.done ? "text-slate-400 line-through dark:text-slate-500" : "text-slate-900 dark:text-slate-100"}`}>
                {t.title}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.subject || "Без предмета"} ·{" "}
                <span className={due.overdue && !t.done ? "font-medium text-rose-600 dark:text-rose-400" : ""}>{due.label}</span>
              </p>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500"><span>{t.durationMinutes ?? 30} мин</span><span>{({ high: "Высокий", medium: "Средний", low: "Низкий" })[t.priority ?? "medium"]} приоритет</span>{t.mandatory && <span className="text-amber-600">Обязательная</span>}<Link className="font-medium text-indigo-500" href={`/timer/?task=${encodeURIComponent(t.id)}`}>Фокус</Link></div>
              {t.steps && t.steps.length > 0 && <details className="mt-2 text-sm"><summary className="cursor-pointer text-indigo-500">Шаги: {t.steps.filter((s) => s.done).length}/{t.steps.length}</summary><div className="mt-2 space-y-2">{t.steps.map((step) => <label key={step.id} className="flex items-start gap-2"><input type="checkbox" className="mt-0.5 accent-indigo-600" checked={step.done} onChange={(e) => updateTask(t.id, { steps: t.steps!.map((s) => s.id === step.id ? { ...s, done: e.target.checked } : s) })} /><span className={step.done ? "line-through text-slate-400" : ""}>{step.title}</span></label>)}</div></details>}
            </div>
            <button type="button" onClick={() => setEditing(t)} aria-label={`Изменить задачу: ${t.title}`} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><Icon name="edit" className="h-4 w-4" /></button>
            <button
              type="button"
              onClick={() => deleteTask(t.id)}
              aria-label={`Удалить задачу: ${t.title}`}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
            >
              <Icon name="trash" className="h-4 w-4" />
            </button>
          </li>
        );
      })}
    </ul><Modal open={!!editing} onClose={() => setEditing(null)} title="Изменить задачу">{editing && <TaskForm key={editing.id} task={editing} onDone={() => setEditing(null)} />}</Modal></>
  );
}
