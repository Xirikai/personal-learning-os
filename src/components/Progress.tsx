import type { DayPoint } from "@/lib/stats";
import { formatMinutes } from "@/lib/stats";
import { WEEKDAYS_SHORT } from "@/lib/dates";

const TONES = {
  indigo: "bg-indigo-600",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
} as const;

export function ProgressBar({
  value, max, label, tone = "indigo",
}: { value: number; max: number; label: string; tone?: keyof typeof TONES }) {
  const percent = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div
      className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={`h-full rounded-full transition-all ${TONES[tone]}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

/** Столбчатая диаграмма учебного времени по дням недели (Пн–Вс), без сторонних библиотек. */
export function WeekBars({ series, today }: { series: DayPoint[]; today: string }) {
  const max = Math.max(60, ...series.map((p) => p.minutes));
  const summary = series.map((p, i) => `${WEEKDAYS_SHORT[i]} — ${formatMinutes(p.minutes)}`).join(", ");
  return (
    <div role="img" aria-label={`Учебное время по дням недели: ${summary}`}>
      <div className="flex h-32 items-end gap-2" aria-hidden="true">
        {series.map((p, i) => {
          const h = p.minutes === 0 ? 0 : Math.max(6, Math.round((p.minutes / max) * 100));
          const isToday = p.iso === today;
          return (
            <div key={p.iso} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{p.minutes > 0 ? formatMinutes(p.minutes).replace(" мин", "м").replace(" ч ", "ч ") : ""}</span>
              <div
                className={`w-full rounded-t-md ${isToday ? "bg-indigo-600" : "bg-indigo-300 dark:bg-indigo-500/50"} ${p.minutes === 0 ? "bg-slate-200 dark:bg-slate-800" : ""}`}
                style={{ height: p.minutes === 0 ? "4px" : `${h}%` }}
                title={`${WEEKDAYS_SHORT[i]}: ${formatMinutes(p.minutes)}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-2" aria-hidden="true">
        {series.map((p, i) => (
          <span
            key={p.iso}
            className={`min-w-0 flex-1 text-center text-xs ${p.iso === today ? "font-semibold text-indigo-700 dark:text-indigo-300" : "text-slate-500 dark:text-slate-400"}`}
          >
            {WEEKDAYS_SHORT[i]}
          </span>
        ))}
      </div>
    </div>
  );
}
