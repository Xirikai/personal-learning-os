"use client";
import { useRef, useState } from "react";
import { useApp } from "@/context/AppProvider";
import { downloadText } from "@/lib/workspace";
import { exportCalendar, importCalendar } from "@/lib/ical";
import { Modal } from "./Modal";
import { btnPrimary, btnSecondary } from "@/lib/ui";
export function CalendarTransfer() {
  const { workspace, updateWorkspace } = useApp(); const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ReturnType<typeof importCalendar> | null>(null), [error, setError] = useState("");
  const fresh = preview?.events.filter((e) => !workspace.events.some((old) => old.id === e.id)) ?? [];
  return <><div className="flex flex-wrap gap-2"><button className={btnSecondary} onClick={() => downloadText("learning-calendar.ics", exportCalendar(workspace.events), "text/calendar;charset=utf-8")}>Экспорт .ics</button><button className={btnSecondary} onClick={() => input.current?.click()}>Импорт .ics</button><input className="hidden" type="file" accept=".ics,text/calendar" ref={input} onChange={async (e) => { const file = e.target.files?.[0]; e.target.value = ""; if (!file) return; try { if (file.size > 2_000_000) throw new Error("Файл больше 2 МБ."); setPreview(importCalendar(await file.text())); setError(""); } catch (err) { setError(err instanceof Error ? err.message : "Ошибка импорта"); } }} /></div>{error && <p role="alert" className="text-sm text-rose-500">{error}</p>}
    <Modal open={!!preview} onClose={() => setPreview(null)} title="Импорт календаря"><div className="space-y-3 text-sm"><p>Будет добавлено событий: {fresh.length}. Совпадающие ID пропускаются; существующие события сохраняются.</p><div className="max-h-60 space-y-2 overflow-y-auto">{fresh.map((e) => <p key={e.id}>{e.start.replace("T", " ")} · {e.title}</p>)}</div>{preview?.errors.map((message, i) => <p key={i} className="text-amber-600">Пропущено: {message}</p>)}<p className="text-slate-500">Поддерживаются отдельные события и простые ежедневные/еженедельные повторы в локальной временной зоне. Импорт не подключает облачный аккаунт.</p><div className="flex gap-2"><button className={btnPrimary} disabled={!fresh.length} onClick={() => { if (updateWorkspace({ ...workspace, events: [...workspace.events, ...fresh] })) setPreview(null); }}>Подтвердить импорт</button><button className={btnSecondary} onClick={() => setPreview(null)}>Отмена</button></div></div></Modal>
  </>;
}
