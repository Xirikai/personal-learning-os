"use client";

import { useMemo, useState } from "react";
import { Card, CardTitle, EmptyState, PageHeader } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { NoteCard, TagChip } from "@/components/NoteCard";
import { useApp } from "@/context/AppProvider";
import type { Note } from "@/lib/types";
import { inputCls } from "@/lib/ui";

type Point = { note: Note; x: number; y: number; degree: number };

export default function KnowledgeMapPage() {
  const { notes: allNotes } = useApp();
  const [tag, setTag] = useState("");
  const notes = useMemo(() => tag ? allNotes.filter((n) => n.tags.includes(tag)) : allNotes, [allNotes, tag]);
  const [selected, setSelected] = useState<Note | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const { byTag, untagged, points, edges } = useMemo(() => {
    const grouped = new Map<string, Note[]>();
    const noTags: Note[] = [];
    for (const note of notes) {
      if (note.tags.length === 0) noTags.push(note);
      for (const tag of note.tags) grouped.set(tag, [...(grouped.get(tag) ?? []), note]);
    }
    const edgeMap = new Map<string, { a: string; b: string; tags: string[] }>();
    for (let i = 0; i < notes.length; i++) for (let j = i + 1; j < notes.length; j++) {
      const common = notes[i].tags.filter((tag) => notes[j].tags.includes(tag));
      if (notes[i].taskId && notes[i].taskId === notes[j].taskId) common.push("общая задача");
      if (common.length) edgeMap.set(`${notes[i].id}:${notes[j].id}`, { a: notes[i].id, b: notes[j].id, tags: common });
    }
    const degree = new Map<string, number>();
    for (const edge of edgeMap.values()) {
      degree.set(edge.a, (degree.get(edge.a) ?? 0) + 1);
      degree.set(edge.b, (degree.get(edge.b) ?? 0) + 1);
    }
    const cx = 360, cy = 245, radius = Math.min(205, 75 + notes.length * 8);
    const coords = notes.map((note, index): Point => {
      const angle = -Math.PI / 2 + (2 * Math.PI * index) / Math.max(1, notes.length);
      return { note, x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius, degree: degree.get(note.id) ?? 0 };
    });
    return { byTag: grouped, untagged: noTags, points: coords, edges: [...edgeMap.values()] };
  }, [notes]);

  const pointById = new Map(points.map((p) => [p.note.id, p]));
  const focusedId = hovered ?? selected?.id ?? null;
  const connected = new Set(edges.filter((edge) => edge.a === focusedId || edge.b === focusedId).flatMap((edge) => [edge.a, edge.b]));

  return (
    <div className="space-y-6">
      <PageHeader title="Knowledge Map" description="Заметки связаны линиями, если у них есть общие теги. Нажми на точку, чтобы открыть заметку." />
      <select aria-label="Фильтр карты по тегу" className={`${inputCls} max-w-sm`} value={tag} onChange={(e) => setTag(e.target.value)}><option value="">Все темы</option>{[...new Set(allNotes.flatMap((n) => n.tags))].sort().map((name) => <option key={name}>{name}</option>)}</select>
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[["Заметок", notes.length], ["Тегов", byTag.size], ["Связей", edges.length]].map(([label, value]) => (
          <Card key={label}><p className="text-sm text-slate-500 dark:text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold sm:text-3xl">{value}</p></Card>
        ))}
      </div>

      {notes.length === 0 ? <EmptyState>Нет заметок для построения связей. Создай их в разделе Vault.</EmptyState> : (
        <Card className="overflow-hidden">
          <CardTitle>Карта заметок</CardTitle>
          <div className="overflow-x-auto">
            <svg viewBox="0 0 720 490" role="img" aria-label={`Карта из ${notes.length} заметок и ${edges.length} связей`} className="mx-auto min-w-[560px] max-w-full">
              <defs><radialGradient id="mapGlow"><stop stopColor="#6366f1" stopOpacity=".12" /><stop offset="1" stopColor="#6366f1" stopOpacity="0" /></radialGradient></defs>
              <circle cx="360" cy="245" r="238" fill="url(#mapGlow)" />
              {edges.map((edge) => {
                const a = pointById.get(edge.a), b = pointById.get(edge.b);
                if (!a || !b) return null;
                const active = focusedId && (edge.a === focusedId || edge.b === focusedId);
                return <line key={`${edge.a}:${edge.b}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={active ? "#6366f1" : "#94a3b8"} strokeOpacity={focusedId ? (active ? .85 : .12) : .28} strokeWidth={active ? 2.5 : 1.25} />;
              })}
              {points.map(({ note, x, y, degree }) => {
                const active = !focusedId || note.id === focusedId || connected.has(note.id);
                const label = note.title.length > 17 ? `${note.title.slice(0, 16)}…` : note.title;
                return (
                  <g key={note.id} role="button" tabIndex={0} aria-label={`Открыть заметку: ${note.title}`} onClick={() => setSelected(note)} onMouseEnter={() => setHovered(note.id)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(note.id)} onBlur={() => setHovered(null)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelected(note); } }} className="cursor-pointer outline-none">
                    <circle cx={x} cy={y} r={Math.min(25, 14 + degree * 2)} fill={note.tags.length ? "#4f46e5" : "#64748b"} fillOpacity={active ? .95 : .25} stroke={focusedId === note.id ? "#a5b4fc" : "white"} strokeWidth={focusedId === note.id ? 4 : 2} />
                    <text x={x} y={y + 39} textAnchor="middle" className="fill-slate-700 text-[11px] dark:fill-slate-200" opacity={active ? 1 : .35}>{label}</text>
                  </g>
                );
              })}
              <text x="360" y="245" textAnchor="middle" className="fill-slate-500 text-xs">Теги соединяют заметки</text>
            </svg>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Размер точки показывает, сколько заметок связано с ней. Заметки без тегов на карте не соединяются.</p>
        </Card>
      )}

      {notes.length > 0 && <div className="grid gap-4 md:grid-cols-2">
        {[...byTag.entries()].sort((a, b) => b[1].length - a[1].length).map(([tag, list]) => (
          <Card key={tag}><CardTitle action={<TagChip>{tag}</TagChip>}>{list.length} {list.length === 1 ? "заметка" : "заметок"}</CardTitle>
            <ul className="space-y-2 text-sm">{list.map((note) => <li key={note.id}><button type="button" onClick={() => setSelected(note)} className="w-full rounded-lg bg-slate-50 px-3 py-2 text-left hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-500/10">{note.title}</button></li>)}</ul>
          </Card>
        ))}
        {untagged.length > 0 && <Card><CardTitle>Без тегов</CardTitle><ul className="space-y-2 text-sm">{untagged.map((note) => <li key={note.id}><button type="button" onClick={() => setSelected(note)} className="w-full rounded-lg bg-slate-50 px-3 py-2 text-left hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-500/10">{note.title}</button></li>)}</ul></Card>}
      </div>}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title ?? "Заметка"}>
        {selected && <NoteCard note={selected} showDelete={false} />}
      </Modal>
    </div>
  );
}
