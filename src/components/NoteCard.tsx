"use client";

import { useState } from "react";
import { useApp } from "@/context/AppProvider";
import type { Note } from "@/lib/types";
import { Icon } from "./Icon";
import { Modal } from "./Modal";
import { NoteForm } from "./NoteForm";
import { MarkdownNote } from "./MarkdownNote";
import { downloadText } from "@/lib/workspace";
import { btnSecondary } from "@/lib/ui";
import Link from "next/link";

export function TagChip({ children }: { children: string }) {
  return (
    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
      {children}
    </span>
  );
}

export function NoteCard({ note, showDelete = true }: { note: Note; showDelete?: boolean }) {
  const { deleteNote, updateNote, tasks } = useApp();
  const [editing, setEditing] = useState(false);
  const [reading, setReading] = useState(false);
  return (
    <>
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <h3 className="break-words text-sm font-semibold text-slate-900 dark:text-slate-100"><button className="text-left hover:text-indigo-500" onClick={() => setReading(true)}>{note.pinned ? "★ " : ""}{note.title}</button></h3>
        {showDelete && (
          <div className="flex shrink-0">
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Изменить заметку: ${note.title}`}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800"
          >
            <Icon name="edit" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => deleteNote(note.id)}
            aria-label={`Удалить заметку: ${note.title}`}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
          >
            <Icon name="trash" className="h-4 w-4" />
          </button>
          </div>
        )}
      </div>
      {note.content && (
        <p className="mt-2 line-clamp-4 whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-400">{note.content}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <button className="rounded-lg px-2 py-1 text-xs text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10" aria-label={`${note.pinned ? "Открепить" : "Закрепить"}: ${note.title}`} onClick={() => updateNote(note.id, { pinned: !note.pinned })}>{note.pinned ? "Открепить" : "Закрепить"}</button>
        {note.tags.map((t) => (
          <TagChip key={t}>{t}</TagChip>
        ))}
        <span className="ml-auto text-xs text-slate-400">{new Date(note.createdAt).toLocaleDateString("ru-RU")}</span>
      </div>
    </article>
    <Modal open={editing} onClose={() => setEditing(false)} title="Изменить заметку">
      <NoteForm key={note.id} note={note} onDone={() => setEditing(false)} />
    </Modal>
    <Modal open={reading} onClose={() => setReading(false)} title={note.title} wide><div className="space-y-4"><MarkdownNote text={note.content} />{note.taskId && <p className="text-sm text-indigo-500">Задача: {tasks.find((t) => t.id === note.taskId)?.title ?? "удалена"}</p>}<div className="flex flex-wrap gap-2"><button className={btnSecondary} onClick={() => downloadText(`${note.title.replace(/[<>:"/\\|?*]/g, "_")}.md`, `# ${note.title}\n\n${note.content}`)}>Скачать .md</button><Link href={`/review/?note=${encodeURIComponent(note.id)}`} className={btnSecondary}>Сделать карточку повторения</Link><button className={btnSecondary} onClick={() => { setReading(false); setEditing(true); }}>Изменить</button></div></div></Modal>
    </>
  );
}
