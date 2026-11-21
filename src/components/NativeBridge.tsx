"use client";
import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function NativeBridge() {
  const router = useRouter(), pathname = usePathname();
  const currentPath = useRef(pathname);
  currentPath.current = pathname;
  useEffect(() => {
    let disposed = false;
    const listeners: { remove: () => Promise<void> }[] = [];
    void (async () => {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform() || disposed) return;
      const { App } = await import('@capacitor/app');
      const back = await App.addListener('backButton', ({ canGoBack }) => {
        if (document.querySelector('[role="dialog"]')) { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); return; }
        if (canGoBack) router.back();
        else if (currentPath.current !== '/') router.replace('/');
        else void App.minimizeApp();
      });
      const resume = await App.addListener('appStateChange', ({ isActive }) => { if (isActive) window.dispatchEvent(new Event('focus')); });
      if (disposed) { await back.remove(); await resume.remove(); }
      else listeners.push(back, resume);
    })().catch(console.error);
    return () => { disposed = true; for (const listener of listeners) void listener.remove(); };
  }, [router]);
  return null;
}
