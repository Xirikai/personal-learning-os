"use client";
import { useEffect, useState, useSyncExternalStore, type FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { Card, CardTitle, PageHeader } from '@/components/Card';
import { createBackup, isAppBackup } from '@/lib/backup';
import { getSupabaseClient } from '@/lib/supabase';
import { getCloudStatus, invalidateCloudSync, pairDevice, subscribeCloudStatus, syncNow } from '@/lib/cloud-sync';
import { downloadText } from '@/lib/workspace';
import { btnPrimary, btnSecondary, inputCls, labelCls } from '@/lib/ui';

export default function SyncPage() {
  const supabase = getSupabaseClient();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [register, setRegister] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const status = useSyncExternalStore(subscribeCloudStatus, getCloudStatus, getCloudStatus);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getSession().then(({ data }) => { if (active) setUser(data.session?.user ?? null); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [supabase]);
  async function auth(event: FormEvent) {
    event.preventDefault(); if (!supabase) return;
    setBusy(true); setMessage('');
    try {
      const result = register ? await supabase.auth.signUp({ email: email.trim(), password }) : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      setPassword('');
      setMessage(register && !result.data.session ? 'Подтвердите регистрацию по ссылке в письме, затем вернитесь в приложение и войдите.' : 'Вход выполнен.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Ошибка входа'); }
    finally { setBusy(false); }
  }
  async function pair(source: 'local' | 'cloud') {
    if (!user) return; setBusy(true); setMessage('');
    try { await pairDevice(user.id, source); } finally { setBusy(false); }
  }
  async function backup(recovery = false) {
    try {
      const raw = recovery ? localStorage.getItem('plos.sync.recovery.v1') : null;
      if (recovery && !raw) throw new Error('На этом устройстве пока нет копии до загрузки из облака.');
      const data: unknown = raw ? JSON.parse(raw) : createBackup();
      if (!isAppBackup(data)) throw new Error('Копия не прошла проверку.');
      await downloadText(`learning-os-${recovery ? 'recovery' : 'backup'}-${Date.now()}.json`, JSON.stringify(data, null, 2), 'application/json');
      setMessage('Выберите, куда сохранить или отправить файл.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Ошибка экспорта'); }
  }
  return <div className="space-y-6">
    <PageHeader title="Телефон и компьютер" description="Один аккаунт — общие задачи, заметки, календарь, привычки и прогресс." />
    <Card><CardTitle>Как подключить два устройства</CardTitle>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300"><li>Откройте этот раздел в новой Windows-версии и войдите в аккаунт.</li><li>На устройстве с нужными данными нажмите «Использовать данные этого устройства».</li><li>На Android войдите в тот же аккаунт и нажмите «Получить данные из облака».</li></ol>
      <p className="mt-3 text-xs text-slate-500">Далее синхронизация работает автоматически, пока приложение открыто. Без интернета данные сохраняются локально и отправляются после подключения. Таймер работает отдельно на каждом устройстве.</p>
    </Card>
    {!supabase ? <Card><CardTitle>Облако не подключено в этой сборке</CardTitle><p>Эта публичная сборка работает локально. Для синхронизации нужна сборка с вашим Supabase-проектом. Инструкция находится в README проекта; перенос через JSON доступен без облака.</p></Card> : user ? <Card>
      <CardTitle>Аккаунт: {user.email}</CardTitle>
      <p role="status" className="mb-4 text-sm">{status.message}{status.at && ` · ${new Date(status.at).toLocaleTimeString('ru-RU')}`}</p>
      <div className="flex flex-wrap gap-2">
        <button className={btnPrimary} disabled={busy} onClick={() => pair('local')}>Использовать данные этого устройства</button>
        <button className={btnSecondary} disabled={busy} onClick={() => pair('cloud')}>Получить данные из облака</button>
        <button className={btnSecondary} disabled={busy} onClick={() => void syncNow(user.id)}>Синхронизировать сейчас</button>
        <button className={btnSecondary} disabled={busy} onClick={async () => { setBusy(true); invalidateCloudSync(); try { const { error } = await supabase.auth.signOut(); if (error) throw error; setMessage('Вы вышли. Данные на устройстве сохранены.'); } catch (e) { setMessage(e instanceof Error ? e.message : 'Ошибка выхода'); } finally { setBusy(false); } }}>Выйти</button>
      </div>
      <p className="mt-4 text-xs text-slate-500">При конфликте автоматическая передача останавливается. Сохраните резервную копию, затем выберите версию устройства или облака. Смена аккаунта требует первого подключения заново.</p>
    </Card> : <Card><CardTitle>{register ? 'Создать аккаунт' : 'Войти в аккаунт'}</CardTitle>
      <form className="max-w-md space-y-4" onSubmit={auth}>
        <div><label className={labelCls} htmlFor="sync-email">Электронная почта</label><input className={inputCls} id="sync-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label className={labelCls} htmlFor="sync-password">Пароль</label><input className={inputCls} id="sync-password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <div className="flex flex-wrap gap-2"><button className={btnPrimary} disabled={busy}>{busy ? 'Подождите…' : register ? 'Создать аккаунт' : 'Войти'}</button><button type="button" className={btnSecondary} disabled={busy} onClick={() => setRegister(!register)}>{register ? 'Уже есть аккаунт' : 'Регистрация'}</button></div>
      </form>
    </Card>}
    <Card><CardTitle>Резервные копии</CardTitle><div className="flex flex-wrap gap-2"><button className={btnSecondary} onClick={() => void backup()}>Скачать данные устройства</button><button className={btnSecondary} onClick={() => void backup(true)}>Копия до загрузки из облака</button></div><p className="mt-3 text-xs text-slate-500">Восстановить JSON-файл можно в настройках приложения.</p></Card>
    {message && <p role="status" className="text-sm">{message}</p>}
  </div>;
}
