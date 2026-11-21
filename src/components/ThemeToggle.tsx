"use client";

import { useApp } from "@/context/AppProvider";
import { Icon } from "./Icon";

export function ThemeToggle({ withLabel = false }: { withLabel?: boolean }) {
  const { toggleTheme } = useApp();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Переключить светлую и тёмную тему"
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      <Icon name="moon" className="h-5 w-5 dark:hidden" />
      <Icon name="sun" className="hidden h-5 w-5 dark:block" />
      {withLabel && (
        <>
          <span className="dark:hidden">Тёмная тема</span>
          <span className="hidden dark:inline">Светлая тема</span>
        </>
      )}
    </button>
  );
}
