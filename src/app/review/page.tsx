"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useApp } from "@/context/AppProvider";
import { Card, CardTitle, PageHeader } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { MarkdownNote } from "@/components/MarkdownNote";
import { makeId } from "@/lib/dates";
import { reviewCard, type ReviewCard } from "@/lib/workspace";
import { btnPrimary, btnSecondary, inputCls, labelCls } from "@/lib/ui";

export default function ReviewPage() {
  const { workspace, updateWorkspace, notes, today } = useApp();
  const [subject, setSubject] = useState("");
  const [answer, setAnswer] = useState(false);
  const [editor, setEditor] = useState<ReviewCard | null>(null);
  const [error, setError] = useState("");
  const cards = workspace.cards.filter((c) => !subject || c.subject === subject);
  const due = cards.filter((c) => c.due <= today).sort((a, b) => a.due.localeCompare(b.due) || a.id.localeCompare(b.id));
  const active = due[0];
  function fresh(): ReviewCard { return { id: makeId(), question: "", answer: "", subject: "", due: today, level: 0, reviews: 0 }; }
  useEffect(() => {
    const noteId = new URLSearchParams(window.location.search).get("note");
    const note = notes.find((n) => n.id === noteId);
    if (note) {
      window.history.replaceState(null, "", window.location.pathname);
      setEditor({ ...fresh(), question: note.title, answer: note.content, subject: note.tags[0] ?? "", noteId: note.id });
    }
    // A reference note is captured once when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function rate(remembered: boolean) {
    if (active && updateWorkspace({ ...workspace, cards: workspace.cards.map((c) => c.id === active.id ? reviewCard(c, remembered, today) : c) })) setAnswer(false);
  }
  function save(e: FormEvent) {
    e.preventDefault(); if (!editor?.question.trim() || !editor.answer.trim()) { setError("Заполните вопрос и ответ."); return; }
    const exists = workspace.cards.some((c) => c.id === editor.id);
    if (updateWorkspace({ ...workspace, cards: exists ? workspace.cards.map((c) => c.id === editor.id ? editor : c) : [...workspace.cards, editor] })) { setEditor(null); setError(""); }
  }
  return <div className="space-y-6"><PageHeader title="Повторение" description="Карточки с интервалами 1, 3, 7, 14 и 30 дней. Оценку знания выбираете вы." />
    <div className="flex flex-wrap gap-3"><button className={btnPrimary} onClick={() => setEditor(fresh())}>Новая карточка</button><select aria-label="Предмет карточек" className={`${inputCls} max-w-xs`} value={subject} onChange={(e) => { setSubject(e.target.value); setAnswer(false); }}><option value="">Все предметы</option>{[...new Set(workspace.cards.map((c) => c.subject).filter(Boolean))].map((s) => <option key={s}>{s}</option>)}</select></div>
    <Card><CardTitle>На повторение: {due.length}</CardTitle>{active ? <div className="space-y-5"><p className="text-sm text-slate-500">{active.subject || "Без предмета"} · повторений: {active.reviews}</p><h2 className="break-words text-xl font-semibold">{active.question}</h2>{answer ? <><MarkdownNote text={active.answer} /><div className="flex flex-wrap gap-2"><button className={btnSecondary} onClick={() => rate(false)}>Повторить завтра</button><button className={btnPrimary} onClick={() => rate(true)}>Помню</button></div></> : <button className={btnPrimary} onClick={() => setAnswer(true)}>Показать ответ</button>}</div> : <p className="text-sm text-slate-500">На сегодня всё повторено. Можно добавить карточку вручную или из заметки в Vault.</p>}</Card>
    <Card><CardTitle>Все карточки · {cards.length}</CardTitle><div className="space-y-2">{cards.map((c) => <button key={c.id} className="flex w-full items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-left text-sm dark:bg-slate-800" onClick={() => { setEditor(c); setError(""); }}><span className="min-w-0 break-words font-medium">{c.question}</span><span className="shrink-0 text-slate-500">{c.due}</span></button>)}</div></Card>
    <Modal open={!!editor} onClose={() => setEditor(null)} title="Карточка повторения">{editor && <form className="space-y-4" onSubmit={save}><label className={labelCls}>Вопрос<input className={`${inputCls} mt-1`} value={editor.question} onChange={(e) => setEditor({ ...editor, question: e.target.value })} /></label><label className={labelCls}>Ответ<textarea rows={5} className={`${inputCls} mt-1`} value={editor.answer} onChange={(e) => setEditor({ ...editor, answer: e.target.value })} /></label><label className={labelCls}>Предмет<input className={`${inputCls} mt-1`} value={editor.subject} onChange={(e) => setEditor({ ...editor, subject: e.target.value })} /></label>{error && <p role="alert" className="text-sm text-rose-500">{error}</p>}<div className="flex flex-wrap gap-2"><button className={btnPrimary}>Сохранить карточку</button><button type="button" className={btnSecondary} onClick={() => setEditor(null)}>Отмена</button>{workspace.cards.some((c) => c.id === editor.id) && <button type="button" className={btnSecondary} onClick={() => { if (window.confirm("Удалить карточку?")) { if (updateWorkspace({ ...workspace, cards: workspace.cards.filter((c) => c.id !== editor.id) })) setEditor(null); } }}>Удалить</button>}</div></form>}</Modal>
  </div>;
}
