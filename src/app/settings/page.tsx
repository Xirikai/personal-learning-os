"use client";

import { useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Card, CardTitle, PageHeader } from "@/components/Card";
import { Icon } from "@/components/Icon";
import { createBackup, isAppBackup, restoreBackup } from "@/lib/backup";
import { btnPrimary, btnSecondary } from "@/lib/ui";
import { WorkspaceSettings } from "@/components/WorkspaceSettings";
import { downloadText } from "@/lib/workspace";

export default function SettingsPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function exportData() {
    try {
      await downloadText(`learning-os-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(createBackup(), null, 2), 'application/json');
      setMessage("Резервная копия подготовлена для сохранения.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось создать копию данных.");
    }
  }

  async function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isAppBackup(parsed)) throw new Error("Файл не похож на резервную копию Learning OS или содержит некорректные данные.");
      if (!window.confirm("Импорт заменит текущие задачи, заметки, журнал, привычки, цели и настройки. Продолжить?")) return;
      restoreBackup(parsed);
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось прочитать файл.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Данные и синхронизация" description="Резервные копии и вход с разных устройств." />
      <WorkspaceSettings />
      <Card>
        <CardTitle>Резервная копия</CardTitle>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">Скачай файл со своими задачами, заметками, занятиями, привычками, целями и настройками. Храни его отдельно от компьютера.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnPrimary} onClick={exportData}><Icon name="vault" className="h-4 w-4" /> Скачать копию</button>
          <button type="button" className={btnSecondary} disabled={busy} onClick={() => inputRef.current?.click()}><Icon name="reset" className="h-4 w-4" /> Восстановить из файла</button>
          <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={importData} />
        </div>
        {message && <p role="status" className="mt-3 text-sm text-slate-600 dark:text-slate-400">{message}</p>}
      </Card>
      <Card>
        <CardTitle>Синхронизация между устройствами</CardTitle>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">Войди в один аккаунт на каждом устройстве, чтобы хранить данные в личном облачном пространстве.</p>
        <Link href="/sync" className={btnSecondary}><Icon name="cloud" className="h-4 w-4" /> Настроить синхронизацию</Link>
      </Card>
    </div>
  );
}
