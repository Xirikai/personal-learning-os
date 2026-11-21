"use client";
import { useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppProvider';
import { useStudy } from '@/context/StudyProvider';
import { useTimer } from '@/context/TimerProvider';
import { getSupabaseClient } from '@/lib/supabase';
import { getCloudStatus, invalidateCloudSync, setCloudStatus, subscribeCloudStatus, syncNow } from '@/lib/cloud-sync';

export function SyncBridge() {
  const { hydrated } = useApp();
  const { ready } = useStudy();
  const { ready: timerReady } = useTimer();
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !hydrated || !ready || !timerReady) return;
    let id: string | null = null;
    const run = () => { if (id && document.visibilityState !== 'hidden') void syncNow(id); };
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user.id ?? null;
      if (next !== id) invalidateCloudSync();
      id = next;
      if (id) window.setTimeout(run, 0);
      else setCloudStatus({ state: 'signed-out', message: 'Войдите в аккаунт для синхронизации' });
    });
    const interval = window.setInterval(run, 5000);
    window.addEventListener('online', run); window.addEventListener('focus', run); document.addEventListener('visibilitychange', run);
    return () => {
      invalidateCloudSync(); data.subscription.unsubscribe(); window.clearInterval(interval);
      window.removeEventListener('online', run); window.removeEventListener('focus', run); document.removeEventListener('visibilitychange', run);
    };
  }, [hydrated, ready, timerReady]);
  return null;
}
export function CloudNotice() {
  const status = useSyncExternalStore(subscribeCloudStatus, getCloudStatus, getCloudStatus);
  if (!['offline', 'error', 'conflict', 'deferred'].includes(status.state)) return null;
  return <div role="status" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">{status.message} <Link className="underline" href="/sync/">Синхронизация</Link></div>;
}
