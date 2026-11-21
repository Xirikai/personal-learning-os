"use client";

import type { ReactNode } from "react";
import { useApp } from "@/context/AppProvider";
import { useStudy } from "@/context/StudyProvider";
import { useTimer } from "@/context/TimerProvider";
import { MobileNav, MobileTopBar } from "./MobileNav";
import { SessionFinishDialog } from "./PendingSession";
import { Sidebar } from "./Sidebar";
import { CloudNotice, SyncBridge } from "./SyncBridge";
import { QuickTools } from "./QuickTools";
import { NativeBridge } from "./NativeBridge";

export function Shell({ children }: { children: ReactNode }) {
  const { hydrated, storageError, dismissStorageError } = useApp();
  const study = useStudy();
  const timer = useTimer();
  const ready = hydrated && study.ready && timer.ready;
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="md:pl-64">
        <MobileTopBar />
        <main className="mx-auto max-w-5xl px-4 py-6 pb-28 md:px-8 md:py-10 md:pb-10">
          {storageError && (
            <div
              role="alert"
              className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
            >
              <span>{storageError}</span>
              <button type="button" onClick={dismissStorageError} className="shrink-0 font-medium underline">
                Закрыть
              </button>
            </div>
          )}
          {ready ? <><CloudNotice /><QuickTools />{children}</> : <p className="text-sm text-slate-500 dark:text-slate-400">Загрузка…</p>}
        </main>
      </div>
      <MobileNav />
      <SessionFinishDialog />
      <SyncBridge />
      <NativeBridge />
    </div>
  );
}
