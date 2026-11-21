"use client";
import Link from "next/link";
import { useApp } from "@/context/AppProvider";
import { useStudy } from "@/context/StudyProvider";
import { shiftISO, weekStartISO } from "@/lib/dates";
import { formatMinutes, minutesInWeek } from "@/lib/stats";
import { occurrences } from "@/lib/workspace";
import { Card, CardTitle } from "./Card";
export function TodayBrief() {
  const { workspace, tasks, today } = useApp();
  const events = occurrences(workspace.events, today, today), due = workspace.cards.filter((c) => c.due <= today).length;
  const urgent = tasks.filter((t) => !t.done).sort((a, b) => Number(!!b.mandatory) - Number(!!a.mandatory) || a.due.localeCompare(b.due))[0];
  return <Card><CardTitle>Пульс дня</CardTitle><div className="grid gap-4 sm:grid-cols-3"><div><p className="text-sm text-slate-500">Первый шаг</p><Link href="/studyos" className="mt-1 block break-words text-sm font-medium text-indigo-500">{urgent?.title ?? "Все задачи выполнены"}</Link></div><div><p className="text-sm text-slate-500">События сегодня: {events.length}</p><Link href="/planner" className="mt-1 block text-sm font-medium text-indigo-500">{events[0] ? `${events[0].start.slice(11)} · ${events[0].title}` : "Запланировать день"}</Link></div><div><p className="text-sm text-slate-500">Материал на повторение</p><Link href="/review" className="mt-1 block text-sm font-medium text-indigo-500">{due ? `${due} карточек ждут повторения` : "На сегодня всё повторено"}</Link></div></div></Card>;
}
export function LearningAnalytics() {
  const { tasks, planner, today, workspace } = useApp(); const { sessions, habits } = useStudy();
  const week = weekStartISO(today), current = minutesInWeek(sessions, week), previous = minutesInWeek(sessions, shiftISO(week, -7));
  const days = Array.from({ length: 84 }, (_, i) => shiftISO(today, i - 83));
  const minutes = new Map<string, number>(), subjects = new Map<string, number>();
  for (const s of sessions) { minutes.set(s.date, (minutes.get(s.date) ?? 0) + s.minutes); if (s.date >= shiftISO(today, -29) && s.date <= today) subjects.set(s.subject || "Без предмета", (subjects.get(s.subject || "Без предмета") ?? 0) + s.minutes); }
  const planned = Object.values(planner.days).filter((p) => p.settings.date >= week && p.settings.date <= shiftISO(week, 6)).reduce((total, p) => total + p.result.studyMinutes, 0);
  const overdue = tasks.filter((t) => !t.done && t.due < today).length, activeDays = days.filter((d) => (minutes.get(d) ?? 0) > 0).length, maxSubject = Math.max(1, ...subjects.values());
  return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-3">{[["Учёба за неделю", formatMinutes(current)], ["План недели", formatMinutes(planned)], ["Активных дней за 12 недель", String(activeDays)]].map(([name, value]) => <Card key={name}><p className="text-sm text-slate-500">{name}</p><p className="mt-2 text-2xl font-bold">{value}</p></Card>)}</div>
    <Card><CardTitle>Учебная активность · 12 недель</CardTitle><div className="grid grid-flow-col grid-rows-7 gap-1.5" role="img" aria-label={`Учебная активность: ${activeDays} дней из 84`}>{days.map((day) => { const value = minutes.get(day) ?? 0; return <div key={day} title={`${day}: ${value} мин`} className={`aspect-square min-h-3 rounded-sm ${value >= 120 ? "bg-indigo-700" : value >= 60 ? "bg-indigo-500" : value > 0 ? "bg-indigo-300" : "bg-slate-100 dark:bg-slate-800"}`} />; })}</div><p className="mt-3 text-sm text-slate-500">Чем насыщеннее цвет, тем больше времени записано в журнале. План не считается фактической учёбой.</p></Card>
    <div className="grid gap-6 lg:grid-cols-2"><Card><CardTitle>Предметы за 30 дней</CardTitle>{subjects.size ? <div className="space-y-3">{[...subjects].sort((a, b) => b[1] - a[1]).map(([name, value]) => <div key={name}><div className="mb-1 flex justify-between gap-3 text-sm"><span>{name}</span><span className="shrink-0 text-slate-500">{formatMinutes(value)}</span></div><div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-indigo-500" style={{ width: `${value / maxSubject * 100}%` }} /></div></div>)}</div> : <p className="text-sm text-slate-500">Запишите занятие или завершите фокус-сессию.</p>}</Card>
    <Card><CardTitle>Обзор недели</CardTitle><div className="space-y-3 text-sm text-slate-600 dark:text-slate-300"><p>{previous ? `Изменение к прошлой неделе: ${current - previous >= 0 ? "+" : ""}${current - previous} мин.` : "Для сравнения недель пока мало записей."}</p><p>{overdue ? `Просроченных задач: ${overdue}. Выберите одну обязательную задачу и выделите ей время в Smart Planner.` : "Просроченных задач нет."}</p><p>План: {planned} мин. В журнале: {current} мин. Запись подтверждает фактическое занятие.</p><p>Карточек на повторение: {workspace.cards.filter((c) => c.due <= today).length}.</p><p>Отметок привычек за неделю: {habits.reduce((sum, h) => sum + h.checks.filter((d) => d >= week && d <= today).length, 0)}.</p></div></Card></div></div>;
}
