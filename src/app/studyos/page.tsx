"use client";

import { useState } from "react";
import { Card, CardTitle, PageHeader } from "@/components/Card";
import { TaskForm } from "@/components/TaskForm";
import { TaskList } from "@/components/TaskList";
import { useApp } from "@/context/AppProvider";
import { inputCls } from "@/lib/ui";

type Filter = "all" | "active" | "done";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "active", label: "Активные" },
  { id: "done", label: "Выполненные" },
];

export default function StudyOSPage() {
  const { tasks, today } = useApp();
  const [filter, setFilter] = useState<Filter>("active");
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("");
  const [overdue, setOverdue] = useState(false);
  const [board, setBoard] = useState(false);

  const shown = tasks
    .filter((t) => (filter === "all" ? true : filter === "done" ? t.done : !t.done))
    .filter((t) => (!query || `${t.title} ${t.subject}`.toLowerCase().includes(query.toLowerCase())) && (!priority || (t.priority ?? "medium") === priority) && (!overdue || !t.done && t.due < today))
    .sort((a, b) => a.due.localeCompare(b.due));

  return (
    <div>
      <PageHeader title="StudyOS" description="Учебные задачи и дедлайны." />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardTitle>Новая задача</CardTitle>
          <TaskForm />
        </Card>
        <Card className="lg:col-span-3">
          <CardTitle>
            Задачи{" "}
            <span className="text-sm font-normal text-slate-500">({shown.length})</span>
          </CardTitle>
          <div className="mb-3 flex gap-2" role="tablist" aria-label="Фильтр задач">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  filter === f.id
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="mb-4 grid gap-2 sm:grid-cols-2"><input type="search" aria-label="Поиск задач" placeholder="Название или предмет" className={inputCls} value={query} onChange={(e) => setQuery(e.target.value)} /><select aria-label="Фильтр по приоритету" className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value)}><option value="">Все приоритеты</option><option value="high">Высокий</option><option value="medium">Средний</option><option value="low">Низкий</option></select></div>
          <div className="mb-4 flex flex-wrap gap-4 text-sm"><label className="flex gap-2"><input type="checkbox" checked={overdue} onChange={(e) => setOverdue(e.target.checked)} />Только просроченные</label><label className="flex gap-2"><input type="checkbox" checked={board} onChange={(e) => setBoard(e.target.checked)} />Доска задач</label></div>
          {board ? <div className="space-y-4">{["К выполнению", "Есть выполненные шаги", "Готово"].map((name, index) => <section key={name} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"><h3 className="mb-2 text-sm font-semibold">{name}</h3><TaskList tasks={shown.filter((t) => (t.done ? 2 : t.steps?.some((s) => s.done) ? 1 : 0) === index)} emptyText="Пока пусто" /></section>)}</div> : <TaskList
            tasks={shown}
            emptyText={filter === "done" ? "Выполненных задач пока нет." : "Здесь пусто. Добавьте задачу слева."}
          />}
        </Card>
      </div>
    </div>
  );
}
