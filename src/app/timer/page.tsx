"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { PendingSessionForm } from "@/components/PendingSession";
import { Card, CardTitle, EmptyState, PageHeader } from "@/components/Card";
import { Icon } from "@/components/Icon";
import { useApp } from "@/context/AppProvider";
import { useStudy } from "@/context/StudyProvider";
import { PHASE_LABEL, formatClock, useTimer } from "@/context/TimerProvider";
import { formatMinutes, minutesOn, sessionsOn } from "@/lib/stats";
import { btnPrimary, btnSecondary, inputCls, labelCls } from "@/lib/ui";
import type { TimerPhase, TimerSettings } from "@/lib/types";

const PHASES: TimerPhase[] = ["focus", "short", "long"];
const RADIUS = 104;
const CIRC = 2 * Math.PI * RADIUS;

function Ring({ fraction, focus, children }: { fraction: number; focus: boolean; children: ReactNode }) {
  const offset = CIRC * (1 - Math.min(1, Math.max(0, fraction)));
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[17rem]">
      <svg viewBox="0 0 240 240" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="120" cy="120" r={RADIUS} fill="none" strokeWidth="12" className="stroke-slate-100 dark:stroke-slate-800" />
        <circle
          cx="120" cy="120" r={RADIUS} fill="none" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={CIRC} strokeDashoffset={offset}
          className={focus ? "stroke-indigo-600 dark:stroke-indigo-400" : "stroke-emerald-500"}
          style={{ transition: "stroke-dashoffset 0.5s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

const SETTING_FIELDS: { key: keyof TimerSettings; label: string; min: number; max: number }[] = [
  { key: "focusMin", label: "Фокус, мин", min: 1, max: 180 },
  { key: "shortMin", label: "Короткий перерыв, мин", min: 1, max: 60 },
  { key: "longMin", label: "Длинный перерыв, мин", min: 1, max: 120 },
  { key: "longEvery", label: "Длинный перерыв после, фокус-сессий", min: 2, max: 10 },
];

function SettingsCard() {
  const { settings, updateSettings } = useTimer();
  const [draft, setDraft] = useState<Partial<Record<keyof TimerSettings, string>>>({});

  function change(key: keyof TimerSettings, raw: string, min: number, max: number) {
    setDraft((d) => ({ ...d, [key]: raw }));
    const n = Number(raw);
    if (raw.trim() !== "" && Number.isInteger(n) && n >= min && n <= max) updateSettings({ ...settings, [key]: n });
  }

  return (
    <Card>
      <CardTitle>Настройки</CardTitle>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {SETTING_FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={`set-${f.key}`} className={labelCls}>{f.label}</label>
            <input
              id={`set-${f.key}`}
              type="number"
              inputMode="numeric"
              min={f.min}
              max={f.max}
              step={1}
              className={inputCls}
              value={draft[f.key] ?? String(settings[f.key])}
              onChange={(e) => change(f.key, e.target.value, f.min, f.max)}
              onBlur={() => setDraft((d) => ({ ...d, [f.key]: undefined }))}
            />
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Изменения применяются к следующей фазе; уже запущенный отсчёт не меняется. Настройки сохраняются автоматически.
      </p>
    </Card>
  );
}

export default function TimerPage() {
  const timer = useTimer();
  const { tasks, today } = useApp();
  const { sessions } = useStudy();
  const { t, settings, remainingMs, elapsedMs } = timer;
  const [focusMode, setFocusMode] = useState(false);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("task");
    const picked = tasks.find((task) => task.id === id);
    if (picked && t.status === "idle") timer.setLabel(picked.title, picked.id);
    // Capture an explicit task link once; navigating does not start a timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const running = t.status === "running";
  const idle = t.status === "idle";
  const focus = t.phase === "focus";
  const blocked = focus && Boolean(t.pending);
  const canFinish = focus && !idle && !t.pending && elapsedMs >= 60_000;
  const fraction = t.durationMs > 0 ? elapsedMs / t.durationMs : 0;

  const openTasks = tasks.filter((x) => !x.done || x.id === t.taskId);
  const todayList = sessionsOn(sessions, today).sort((a, b) => b.createdAt - a.createdAt);

  function onTask(id: string) {
    const task = tasks.find((x) => x.id === id);
    timer.setLabel(!t.label.trim() && task ? task.title : t.label, id || null);
  }

  return (
    <div className={focusMode ? "fixed inset-0 z-40 overflow-y-auto bg-slate-50 p-5 dark:bg-slate-950 sm:p-10" : ""}>
      <div className="mb-4 flex justify-end"><button className={btnSecondary} onClick={() => setFocusMode(!focusMode)}>{focusMode ? "Выйти из режима фокуса" : "Режим фокуса"}</button></div>
      <PageHeader title="Таймер" description="Pomodoro: фокус-сессии и перерывы. Отсчёт продолжается при смене страницы и вкладки." />
      <div className={focusMode ? "mx-auto max-w-2xl" : "grid gap-6 lg:grid-cols-5"}>
        <div className="min-w-0 space-y-6 lg:col-span-3">
          <Card>
            <div className="mb-5 flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="Фаза таймера">
              {PHASES.map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={!idle && t.phase !== p}
                  aria-pressed={t.phase === p}
                  onClick={() => timer.setPhase(p)}
                  className={`min-w-0 flex-1 truncate rounded-lg px-2 py-2 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm ${
                    t.phase === p
                      ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-900 dark:text-indigo-300"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  }`}
                >
                  {PHASE_LABEL[p]}
                </button>
              ))}
            </div>

            <Ring fraction={fraction} focus={focus}>
              <span
                className="text-5xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-50"
                role="timer"
                aria-label={`Осталось ${formatClock(remainingMs)}`}
              >
                {formatClock(remainingMs)}
              </span>
              <span className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {PHASE_LABEL[t.phase]} · {running ? "идёт" : idle ? "готов" : "пауза"}
              </span>
            </Ring>

            <div className="mt-4 flex items-center justify-center gap-1.5" aria-label={`Фокус-сессий в круге: ${t.cycle} из ${settings.longEvery}`} role="img">
              {Array.from({ length: settings.longEvery }, (_, i) => (
                <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < t.cycle ? "bg-indigo-600 dark:bg-indigo-400" : "bg-slate-200 dark:bg-slate-700"}`} />
              ))}
            </div>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {running ? (
                <button type="button" className={btnPrimary} onClick={timer.pause}>
                  <Icon name="pause" className="h-4 w-4" /> Пауза
                </button>
              ) : (
                <button type="button" className={btnPrimary} onClick={timer.start} disabled={blocked}>
                  <Icon name="play" className="h-4 w-4" /> {idle ? "Старт" : "Продолжить"}
                </button>
              )}
              <button type="button" className={btnSecondary} onClick={timer.reset} disabled={idle && t.remainingMs === t.durationMs}>
                <Icon name="reset" className="h-4 w-4" /> Сброс
              </button>
              {focus && (
                <button type="button" className={btnSecondary} onClick={timer.finishEarly} disabled={!canFinish} title={canFinish ? undefined : "Доступно после первой минуты работы"}>
                  <Icon name="check" className="h-4 w-4" /> Завершить и записать
                </button>
              )}
              {!focus && (
                <button type="button" className={btnSecondary} onClick={timer.skipBreak}>
                  <Icon name="skip" className="h-4 w-4" /> Пропустить перерыв
                </button>
              )}
            </div>
            {blocked && (
              <p className="mt-3 text-center text-sm text-amber-700 dark:text-amber-300">
                Сначала запишите или пропустите завершённую сессию (ниже).
              </p>
            )}

            <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 dark:border-slate-800 sm:grid-cols-2">
              <div>
                <label htmlFor="timer-label" className={labelCls}>Чем занимаетесь?</label>
                <input
                  id="timer-label"
                  className={inputCls}
                  value={t.label}
                  maxLength={120}
                  onChange={(e) => timer.setLabel(e.target.value, t.taskId)}
                  placeholder="Предмет или тема"
                />
              </div>
              <div>
                <label htmlFor="timer-task" className={labelCls}>Задача</label>
                <select id="timer-task" className={inputCls} value={t.taskId ?? ""} onChange={(e) => onTask(e.target.value)}>
                  <option value="">Без задачи</option>
                  {openTasks.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
                  {t.taskId && !tasks.some((x) => x.id === t.taskId) && <option value={t.taskId}>Задача удалена</option>}
                </select>
              </div>
            </div>
          </Card>

          {t.pending && (
            <Card className="border-indigo-300 dark:border-indigo-500/50">
              <CardTitle>Записать в журнал: {formatMinutes(t.pending.minutes)}</CardTitle>
              <PendingSessionForm />
            </Card>
          )}
        </div>

        {!focusMode && <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card>
            <CardTitle action={<Link href="/journal" className="text-sm font-medium text-indigo-600 dark:text-indigo-300">Журнал</Link>}>
              Сегодня
            </CardTitle>
            <p className="text-3xl font-bold">{formatMinutes(minutesOn(sessions, today))}</p>
            <p className="mb-3 mt-1 text-sm text-slate-500 dark:text-slate-400">записей: {todayList.length}</p>
            {todayList.length === 0 ? (
              <EmptyState>Сегодня занятий ещё нет.</EmptyState>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {todayList.slice(0, 5).map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 truncate">{s.subject || "Без предмета"}</span>
                    <span className="shrink-0 text-slate-500 dark:text-slate-400">{formatMinutes(s.minutes)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <SettingsCard />
        </div>}
      </div>
    </div>
  );
}
