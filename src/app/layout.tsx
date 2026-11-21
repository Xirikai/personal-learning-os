import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Shell } from "@/components/Shell";
import { AppProvider } from "@/context/AppProvider";
import { StudyProvider } from "@/context/StudyProvider";
import { TimerProvider } from "@/context/TimerProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Learning OS",
  description: "Персональная система для учёбы, заметок и управления знаниями",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Применяет сохранённую тему до первой отрисовки, чтобы не было мигания.
const themeScript = `try{var t=localStorage.getItem('plos.theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <AppProvider>
          <StudyProvider>
            <TimerProvider>
              <Shell>{children}</Shell>
            </TimerProvider>
          </StudyProvider>
        </AppProvider>
      </body>
    </html>
  );
}
