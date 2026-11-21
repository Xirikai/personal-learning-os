"use client";

import Link from "next/link";
import { PHASE_LABEL, formatClock, useTimer } from "@/context/TimerProvider";
import { Icon } from "./Icon";

/** Компактный индикатор таймера: виден на любой странице, пока таймер идёт или стоит на паузе. */
export function TimerChip({ className = "" }: { className?: string }) {
  const { t, remainingMs } = useTimer();
  if (t.status === "idle") return null;
  const paused = t.status === "paused";
  return (
    <Link
      href="/timer"
      aria-label={`${PHASE_LABEL[t.phase]}${paused ? " (пауза)" : ""}: осталось ${formatClock(remainingMs)}. Открыть таймер`}
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium tabular-nums transition ${
        t.phase === "focus"
          ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300"
          : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
      } ${className}`}
    >
      <Icon name={paused ? "pause" : "timer"} className="h-4 w-4 shrink-0" />
      <span className="truncate">{PHASE_LABEL[t.phase]}</span>
      <span className="ml-auto">{formatClock(remainingMs)}</span>
    </Link>
  );
}
