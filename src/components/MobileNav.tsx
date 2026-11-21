"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_ITEMS } from "@/lib/nav";
import { Icon } from "./Icon";
import { Modal } from "./Modal";
import { isActive } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { TimerChip } from "./TimerChip";

export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 md:hidden">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
          PL
        </span>
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Learning OS</span>
      </div>
      <div className="flex items-center gap-2">
        <TimerChip className="px-2.5! py-1.5! text-xs [&>span:nth-child(2)]:hidden" />
        <ThemeToggle />
      </div>
    </header>
  );
}

const PRIMARY = NAV_ITEMS.filter((i) => i.primary);
const SECONDARY = NAV_ITEMS.filter((i) => !i.primary);

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = SECONDARY.some((i) => isActive(pathname, i.href));
  const tabCls = (active: boolean) =>
    `flex flex-col items-center gap-1 px-1 py-2 text-[11px] font-medium ${
      active ? "text-indigo-600 dark:text-indigo-300" : "text-slate-500 dark:text-slate-400"
    }`;

  return (
    <>
      <nav
        aria-label="Основная навигация"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 md:hidden"
      >
        {PRIMARY.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={tabCls(active)}>
              <Icon name={item.icon} className="h-5 w-5" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          className={tabCls(moreActive)}
        >
          <Icon name="more" className="h-5 w-5" />
          <span>Ещё</span>
        </button>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="Разделы">
        <ul className="grid gap-1">
          {SECONDARY.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${
                    active
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon name={item.icon} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </Modal>
    </>
  );
}
