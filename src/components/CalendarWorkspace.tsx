"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useApp } from "@/context/AppProvider";
import { shiftISO, weekDatesISO, makeId } from "@/lib/dates";
import { addLocalMinutes, CATEGORIES, conflicts, isCalendarEvent, occurrences, type CalendarEvent, type EventOccurrence } from "@/lib/workspace";
import { btnPrimary, btnSecondary, inputCls, labelCls } from "@/lib/ui";
import type { Language } from "@/lib/smart-planner";
import { Modal } from "./Modal";
import { Card } from "./Card";
import { Icon } from "./Icon";
import { TaskForm } from "./TaskForm";
import type { Task } from "@/lib/types";

export type CalendarView = "month" | "week" | "day" | "agenda";
const colors = { study: "border-indigo-400 bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100", personal: "border-amber-400 bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100", work: "border-cyan-400 bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-100", rest: "border-emerald-400 bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100" };
type Entry = { id: string; title: string; start: string; end: string; category: CalendarEvent["category"]; event?: EventOccurrence; task?: Task; rest?: boolean };

export function CalendarWorkspace({ date, view, language, onDateChange }: { date: string; view: CalendarView; language: Language; onDateChange: (date: string) => void }) {
  const { workspace, updateWorkspace, planner, tasks, today } = useApp();
  const [editor, setEditor] = useState<{ event: CalendarEvent; split?: EventOccurrence } | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [showBreaks, setShowBreaks] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const tr = (ru: string, en: string) => language === "ru" ? ru : en;
  const days = view === "week" ? weekDatesISO(date) : view === "agenda" ? Array.from({ length: 7 }, (_, i) => shiftISO(date, i)) : [date];
  const events = occurrences(workspace.events, days[0], days[days.length - 1]);
  const entries: Entry[] = events.filter((e) => !hidden.includes(e.category)).map((event) => ({ ...event, id: event.occurrenceId, event }));
  for (const plan of Object.values(planner.days)) for (const block of plan.result.blocks) {
    if (block.kind === "free" || block.kind === "unavailable" || block.kind === "break" && !showBreaks || hidden.includes("study")) continue;
    if (block.start >= `${shiftISO(days[days.length - 1], 1)}T00:00` || block.end <= `${days[0]}T00:00`) continue;
    const linked = tasks.find((t) => t.id === block.taskId);
    entries.push({ id: `${plan.settings.date}-${block.id}`, title: block.kind === "break" ? tr("Перерыв", "Break") : linked?.title ?? tr("Удалённая задача", "Deleted task"), start: block.start, end: block.end, category: "study", task: linked, rest: block.kind === "break" });
  }
  useEffect(() => { if (scroll.current) scroll.current.scrollTop = 8 * 56; }, [view]);
  function create(start = `${date}T16:00`) { setEditor({ event: { id: makeId(), title: "", start, end: addLocalMinutes(start, 60), category: "study", repeat: "none", note: "" } }); }
  function move(entry: EventOccurrence, start: string) {
    const duration = (Date.parse(`${entry.end}:00Z`) - Date.parse(`${entry.start}:00Z`)) / 60000;
    setEditor({ event: { ...entry, id: entry.repeat === "none" ? entry.sourceId : makeId(), start, end: addLocalMinutes(start, duration), repeat: "none", until: undefined, excludedDates: undefined }, ...(entry.repeat === "none" ? {} : { split: entry }) });
  }
  function save(event: CalendarEvent) {
    let next = workspace.events;
    if (editor?.split) next = next.map((e) => e.id === editor.split!.sourceId ? { ...e, excludedDates: [...(e.excludedDates ?? []), editor.split!.occurrenceDate] } : e);
    const exists = next.some((e) => e.id === event.id);
    next = exists ? next.map((e) => e.id === event.id ? event : e) : [...next, event];
    if (updateWorkspace({ ...workspace, events: next })) setEditor(null);
  }
  const labelDate = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", { weekday: "short", day: "numeric", month: "short" });
  return <Card className="mb-6 min-w-0">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        <button className={btnSecondary} onClick={() => onDateChange(shiftISO(date, view === "week" || view === "agenda" ? -7 : -1))} aria-label={tr("Предыдущий период", "Previous period")}><Icon name="chevronLeft" className="h-4 w-4" /></button>
        <button className={btnSecondary} onClick={() => onDateChange(today)}>{tr("Сегодня", "Today")}</button>
        <button className={btnSecondary} onClick={() => onDateChange(shiftISO(date, view === "week" || view === "agenda" ? 7 : 1))} aria-label={tr("Следующий период", "Next period")}><Icon name="chevronRight" className="h-4 w-4" /></button>
      </div>
      <button className={btnPrimary} onClick={() => create()}><Icon name="plus" className="h-4 w-4" />{tr("Событие", "Event")}</button>
    </div>
    <div className="mb-4 flex flex-wrap gap-3 text-sm">
      {(Object.keys(CATEGORIES) as CalendarEvent["category"][]).map((category) => <label key={category} className="flex items-center gap-1.5"><input type="checkbox" className="accent-indigo-600" checked={!hidden.includes(category)} onChange={(e) => setHidden(e.target.checked ? hidden.filter((c) => c !== category) : [...hidden, category])} />{language === "ru" ? CATEGORIES[category] : { study: "Study", personal: "Personal", work: "Work", rest: "Rest" }[category]}</label>)}
      <label className="flex items-center gap-1.5"><input type="checkbox" checked={showBreaks} onChange={(e) => setShowBreaks(e.target.checked)} className="accent-indigo-600" />{tr("Перерывы плана", "Plan breaks")}</label>
    </div>
    {view === "month" || view === "agenda" ? <div className="space-y-4">
      {days.map((day) => <section key={day}><h3 className="mb-2 text-sm font-semibold capitalize">{labelDate(day)}</h3>
        <div className="space-y-2">{entries.filter((e) => e.start < `${shiftISO(day, 1)}T00:00` && e.end > `${day}T00:00`).sort((a, b) => a.start.localeCompare(b.start)).map((entry) => <button key={entry.id} className={`flex w-full items-center gap-3 rounded-xl border-l-4 p-3 text-left text-sm ${colors[entry.category]}`} onClick={() => entry.event ? setEditor({ event: workspace.events.find((e) => e.id === entry.event!.sourceId)! }) : entry.task && setTask(entry.task)}><span className="shrink-0 tabular-nums">{entry.start.slice(11)}–{entry.end.slice(11)}</span><span className="min-w-0 break-words font-medium">{entry.title}</span></button>)}</div>
        {!entries.some((e) => e.start.slice(0, 10) === day) && <p className="py-2 text-sm text-slate-500">{tr("Нет событий. Добавьте событие или составьте умный план.", "No events. Add an event or generate a smart plan.")}</p>}
      </section>)}
    </div> : <>
      <div ref={scroll} className="max-h-[620px] overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <div style={{ minWidth: view === "week" ? 760 : 260 }}>
          <div className="sticky top-0 z-20 grid border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" style={{ gridTemplateColumns: `48px repeat(${days.length}, minmax(0,1fr))` }}><div />{days.map((day) => <button key={day} className={`px-1 py-3 text-sm capitalize ${day === today ? "font-bold text-indigo-500" : ""}`} onClick={() => onDateChange(day)}>{labelDate(day)}</button>)}</div>
          <div className="grid" style={{ gridTemplateColumns: `48px repeat(${days.length}, minmax(0,1fr))` }}>
            <div>{Array.from({ length: 24 }, (_, h) => <div key={h} className="h-14 pr-1 text-right text-xs tabular-nums text-slate-500">{String(h).padStart(2, "0")}:00</div>)}</div>
            {days.map((day) => {
              const list = entries.filter((e) => e.start < `${shiftISO(day, 1)}T00:00` && e.end > `${day}T00:00`).sort((a, b) => a.start.localeCompare(b.start));
              const lanes: string[] = [], placed = list.map((e) => {
                let lane = lanes.findIndex((end) => end <= e.start); if (lane < 0) lane = lanes.length; lanes[lane] = e.end; return { e, lane };
              });
              return <div key={day} className="relative border-l border-slate-200 dark:border-slate-700" style={{ height: 24 * 56 }}>
                {Array.from({ length: 24 }, (_, h) => <button key={h} className="absolute inset-x-0 h-14 border-t border-slate-100 hover:bg-indigo-50/50 dark:border-slate-800 dark:hover:bg-indigo-500/10" style={{ top: h * 56 }} aria-label={`${tr("Добавить событие", "Add event")}: ${day} ${h}:00`} onClick={() => create(`${day}T${String(h).padStart(2, "0")}:00`)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => {
                  e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); const entry = events.find((event) => event.occurrenceId === id); if (entry) move(entry, `${day}T${String(h).padStart(2, "0")}:00`);
                }} />)}
                {placed.map(({ e, lane }) => {
                  const start = Math.max(0, (Date.parse(`${e.start}:00Z`) - Date.parse(`${day}T00:00:00Z`)) / 60000);
                  const end = Math.min(1440, (Date.parse(`${e.end}:00Z`) - Date.parse(`${day}T00:00:00Z`)) / 60000);
                  return <button key={e.id} draggable={!!e.event} onDragStart={(event) => { if (e.event) event.dataTransfer.setData("text/plain", e.event.occurrenceId); }} onClick={() => e.event ? setEditor({ event: workspace.events.find((event) => event.id === e.event!.sourceId)! }) : e.task && setTask(e.task)} className={`absolute z-10 overflow-hidden rounded-lg border-l-4 px-1.5 py-1 text-left text-xs ${colors[e.category]} ${e.rest ? "opacity-60" : ""}`} style={{ top: start / 60 * 56, height: Math.max(24, (end - start) / 60 * 56 - 2), left: `${lane / Math.max(1, lanes.length) * 100}%`, width: `${100 / Math.max(1, lanes.length)}%` }} title={`${e.title} · ${e.start.slice(11)}–${e.end.slice(11)}`}><span className="block truncate font-semibold">{e.title}</span><span className="block truncate opacity-70">{e.start.slice(11)}–{e.end.slice(11)}</span></button>;
                })}
              </div>;
            })}
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-500">{tr("Нажмите на час для нового события. События можно перетаскивать; новое время сохраняется после подтверждения. На телефоне используйте редактирование.", "Select a time to add an event. Drag an event to propose a new time, then confirm. On mobile, use the event editor.")}</p>
    </>}
    <Modal open={!!editor} onClose={() => setEditor(null)} title={tr("Событие календаря", "Calendar event")} closeLabel={tr("Закрыть", "Close")}>
      {editor && <EventEditor key={`${editor.event.id}-${editor.event.start}`} event={editor.event} others={[...events.filter((e) => e.sourceId !== editor.event.id && e.occurrenceId !== editor.split?.occurrenceId), ...entries.filter((e) => e.task)]} language={language} split={!!editor.split} onSave={save} onCancel={() => setEditor(null)} onDelete={workspace.events.some((e) => e.id === editor.event.id) ? () => {
        if (window.confirm(tr("Удалить событие и все его повторения?", "Delete this event and all repeats?")) && updateWorkspace({ ...workspace, events: workspace.events.filter((e) => e.id !== editor.event.id) })) setEditor(null);
      } : undefined} />}
    </Modal>
    <Modal open={!!task} onClose={() => setTask(null)} title={tr("Задача", "Task")}><>{task && <TaskForm task={task} onDone={() => setTask(null)} language={language} />}</></Modal>
  </Card>;
}

function EventEditor({ event, others, language, split, onSave, onCancel, onDelete }: { event: CalendarEvent; others: { start: string; end: string }[]; language: Language; split: boolean; onSave: (event: CalendarEvent) => void; onCancel: () => void; onDelete?: () => void }) {
  const [draft, setDraft] = useState(event), [error, setError] = useState(""), [accept, setAccept] = useState(false);
  const tr = (ru: string, en: string) => language === "ru" ? ru : en;
  const overlaps = conflicts(draft, others).length;
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!isCalendarEvent(draft) || draft.until && draft.until < draft.start.slice(0, 10)) return setError(tr("Проверьте название, время окончания и дату последнего повтора.", "Check the title, end time and last repeat date."));
    if (overlaps && !accept) return setError(tr("Подтвердите пересечение или измените время.", "Confirm the overlap or adjust the time."));
    onSave({ ...draft, title: draft.title.trim() });
  }
  return <form onSubmit={submit} className="space-y-4">
    {split && <p className="text-sm text-indigo-500">{tr("Переносится только выбранное повторение.", "Only this occurrence is moved.")}</p>}
    <label className={labelCls}>{tr("Название события", "Event title")}<input className={`${inputCls} mt-1`} value={draft.title} maxLength={200} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
    <div className="grid gap-3 sm:grid-cols-2"><label className={labelCls}>{tr("Начало события", "Event starts")}<input className={`${inputCls} mt-1`} type="datetime-local" value={draft.start} onInput={(e) => { setDraft({ ...draft, start: e.currentTarget.value }); setAccept(false); }} /></label><label className={labelCls}>{tr("Конец события", "Event ends")}<input className={`${inputCls} mt-1`} type="datetime-local" value={draft.end} onInput={(e) => { setDraft({ ...draft, end: e.currentTarget.value }); setAccept(false); }} /></label></div>
    <div className="grid gap-3 sm:grid-cols-2"><label className={labelCls}>{tr("Календарь", "Calendar")}<select className={`${inputCls} mt-1`} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as CalendarEvent["category"] })}>{(Object.entries(CATEGORIES)).map(([id, name]) => <option key={id} value={id}>{language === "ru" ? name : id}</option>)}</select></label><label className={labelCls}>{tr("Повторять", "Repeat")}<select className={`${inputCls} mt-1`} value={draft.repeat} onChange={(e) => setDraft({ ...draft, repeat: e.target.value as CalendarEvent["repeat"] })}><option value="none">{tr("Не повторять", "Never")}</option><option value="daily">{tr("Ежедневно", "Daily")}</option><option value="weekly">{tr("Еженедельно", "Weekly")}</option></select></label></div>
    {draft.repeat !== "none" && <><label className={labelCls}>{tr("Последняя дата повторения (необязательно)", "Last repeat date (optional)")}<input className={`${inputCls} mt-1`} type="date" value={draft.until ?? ""} onInput={(e) => setDraft({ ...draft, until: e.currentTarget.value || undefined })} /></label><p className="text-sm text-slate-500">{tr("Редактирование и удаление здесь относятся ко всей серии.", "Editing and deleting here affect the whole series.")}</p></>}
    <label className={labelCls}>{tr("Описание", "Description")}<textarea className={`${inputCls} mt-1`} rows={3} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></label>
    {overlaps > 0 && <label className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200"><input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} />{tr(`Есть пересечения (${overlaps}). Сохранить указанное время осознанно.`, `Overlaps found (${overlaps}). Keep these times intentionally.`)}</label>}
    {error && <p role="alert" className="text-sm text-rose-500">{error}</p>}
    <div className="flex flex-wrap gap-2"><button type="submit" className={btnPrimary}>{tr("Сохранить событие", "Save event")}</button><button type="button" className={btnSecondary} onClick={onCancel}>{tr("Отмена", "Cancel")}</button>{onDelete && <button type="button" className={btnSecondary} onClick={onDelete}>{tr("Удалить", "Delete")}</button>}</div>
  </form>;
}
