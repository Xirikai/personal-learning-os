"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppProvider";
import { useStudy } from "@/context/StudyProvider";
import { occurrences, localDateTime } from "@/lib/workspace";
import { btnSecondary, inputCls } from "@/lib/ui";
import { Modal } from "./Modal";
import { TaskForm } from "./TaskForm";
import { NoteForm } from "./NoteForm";
import { MarkdownNote } from "./MarkdownNote";
import type { Note, Task } from "@/lib/types";
export function QuickTools() {
  const { tasks, notes, workspace, today } = useApp(); const { habits } = useStudy();
  const [mode, setMode] = useState<"search" | "task" | "note" | null>(null), [query, setQuery] = useState("");
  const [task, setTask] = useState<Task | undefined>(), [note, setNote] = useState<Note | null>(null);
  const [now, setNow] = useState(() => localDateTime(new Date()));
  useEffect(() => { const key = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); if (!document.querySelector('[role="dialog"]')) setMode("search"); } }; const id = window.setInterval(() => setNow(localDateTime(new Date())), 30000); window.addEventListener("keydown", key); return () => { window.removeEventListener("keydown", key); clearInterval(id); }; }, []);
  const q = query.trim().toLowerCase(), match = (value: string) => !!q && value.toLowerCase().includes(q);
  const upcoming = workspace.preferences.reminders ? occurrences(workspace.events, today, today).find((e) => e.start >= now && Date.parse(e.start) - Date.parse(now) <= 15 * 60000) : undefined;
  return <><div className="mb-5 flex flex-wrap gap-2"><button className={btnSecondary} onClick={() => { setTask(undefined); setMode("task"); }}>+ Задача</button><button className={btnSecondary} onClick={() => setMode("note")}>+ Заметка</button><button className={`${btnSecondary} sm:ml-auto`} onClick={() => setMode("search")}>Поиск <span className="text-xs text-slate-400">Ctrl K</span></button></div>
    {upcoming && <Link href="/planner" className="mb-4 block rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">Скоро: {upcoming.start.slice(11)} · {upcoming.title}</Link>}
    <Modal open={mode === "search"} onClose={() => setMode(null)} title="Поиск по всему приложению" wide><input type="search" className={inputCls} placeholder="Задача, заметка, событие, привычка или карточка" aria-label="Общий поиск" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus /><div className="mt-4 space-y-2">
      {tasks.filter((t) => match(`${t.title} ${t.subject}`)).slice(0, 8).map((t) => <button key={t.id} className="block w-full rounded-xl bg-slate-50 p-3 text-left text-sm dark:bg-slate-800" onClick={() => { setTask(t); setMode("task"); }}>Задача · {t.title}</button>)}
      {notes.filter((n) => match(`${n.title} ${n.content} ${n.tags.join(" ")}`)).slice(0, 8).map((n) => <button key={n.id} className="block w-full rounded-xl bg-slate-50 p-3 text-left text-sm dark:bg-slate-800" onClick={() => { setMode(null); setNote(n); }}>Заметка · {n.title}</button>)}
      {workspace.events.filter((e) => match(e.title)).slice(0, 8).map((e) => <Link key={e.id} className="block rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800" href={`/planner/?date=${e.start.slice(0, 10)}`} onClick={() => setMode(null)}>Событие · {e.title}</Link>)}
      {habits.filter((h) => match(h.name)).map((h) => <Link key={h.id} href="/habits" onClick={() => setMode(null)} className="block rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">Привычка · {h.name}</Link>)}
      {workspace.cards.filter((c) => match(`${c.question} ${c.answer}`)).slice(0, 8).map((c) => <Link key={c.id} href="/review" onClick={() => setMode(null)} className="block rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">Карточка · {c.question}</Link>)}
      {!q && <p className="text-sm text-slate-500">Начните вводить текст. Поиск работает локально.</p>}
    </div></Modal>
    <Modal open={mode === "task"} onClose={() => setMode(null)} title={task ? "Изменить задачу" : "Новая задача"}><TaskForm key={task?.id ?? "new"} task={task} onDone={() => setMode(null)} /></Modal>
    <Modal open={mode === "note"} onClose={() => setMode(null)} title="Новая заметка"><NoteForm onDone={() => setMode(null)} /></Modal>
    <Modal open={!!note} onClose={() => setNote(null)} title={note?.title ?? "Заметка"} wide>{note && <MarkdownNote text={note.content} />}</Modal>
  </>;
}
