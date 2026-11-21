"use client";

import { useApp } from "@/context/AppProvider";
import { useStudy } from "@/context/StudyProvider";
import { useTimer } from "@/context/TimerProvider";
import { formatMinutes } from "@/lib/stats";
import { Modal } from "./Modal";
import { SessionForm } from "./SessionForm";

/** Форма «записать завершённую фокус-сессию в журнал». Данные берутся из таймера, дублировать не нужно. */
export function PendingSessionForm() {
  const { t, clearPending } = useTimer();
  const { addSession } = useStudy();
  const p = t.pending;
  if (!p) return null;
  return (
    <SessionForm
      key={p.id}
      lockDate
      initial={{ date: p.date, minutes: p.minutes, subject: p.subject, note: "", taskId: p.taskId }}
      submitLabel="Записать в журнал"
      cancelLabel="Не записывать"
      onSubmit={(v) => {
        addSession({ ...v, source: "pomodoro" });
        clearPending();
      }}
      onCancel={clearPending}
    />
  );
}

/** Окно, которое появляется на любой странице, когда фокус-сессия завершилась. */
export function SessionFinishDialog() {
  const { t, dialogHidden, hideDialog } = useTimer();
  const { hydrated } = useApp();
  const p = t.pending;
  return (
    <Modal open={hydrated && Boolean(p) && !dialogHidden} onClose={hideDialog} title="Фокус-сессия завершена">
      {p && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Записать <b className="text-slate-900 dark:text-slate-100">{formatMinutes(p.minutes)}</b> в журнал занятий? Закрыв окно, вы
            сможете вернуться к записи на странице «Таймер».
          </p>
          <PendingSessionForm />
        </div>
      )}
    </Modal>
  );
}
