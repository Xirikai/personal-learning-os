"use client";

import { useId, useState, type FormEvent } from "react";
import { useApp } from "@/context/AppProvider";
import type { Note } from "@/lib/types";
import { btnPrimary, inputCls, labelCls } from "@/lib/ui";

export function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const tag = part.trim().toLowerCase();
    if (tag) seen.add(tag);
  }
  return Array.from(seen).slice(0, 5);
}

export function NoteForm({ note, onDone }: { note?: Note; onDone?: () => void }) {
  const { addNote, updateNote, tasks } = useApp();
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [tags, setTags] = useState(note?.tags.join(", ") ?? "");
  const [error, setError] = useState("");
  const [taskId, setTaskId] = useState(note?.taskId ?? "");
  const uid = useId();

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Введите заголовок заметки.");
      return;
    }
    const value = { title: title.trim(), content: content.trim(), tags: parseTags(tags), taskId: taskId || undefined };
    if (note) updateNote(note.id, value);
    else {
      addNote(value);
      setTitle("");
      setContent("");
      setTags("");
    }
    setError("");
    onDone?.();
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor={`${uid}-title`} className={labelCls}>Заголовок</label>
        <input id={`${uid}-title`} className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Тема заметки" />
      </div>
      <div>
        <label htmlFor={`${uid}-content`} className={labelCls}>Текст</label>
        <textarea id={`${uid}-content`} rows={4} className={inputCls} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Ключевые мысли, формулы, определения…" />
      </div>
      <div>
        <label htmlFor={`${uid}-tags`} className={labelCls}>Теги через запятую</label>
        <input id={`${uid}-tags`} className={inputCls} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="математика, анализ" />
      </div>
      <label className={labelCls}>Связанная задача<select className={`${inputCls} mt-1`} value={taskId} onChange={(e) => setTaskId(e.target.value)}><option value="">Без задачи</option>{tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
      <p className="text-xs text-slate-500">Поддерживается Markdown: # заголовок, **выделение**, списки и блоки кода.</p>
      {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      <button type="submit" className={btnPrimary}>{note ? "Сохранить изменения" : "Сохранить заметку"}</button>
    </form>
  );
}
