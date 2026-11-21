import { createBackup, isAppBackup, readSyncMarker, restoreBackup, writeSyncMarker, type AppBackup } from './backup';
import { getSupabaseClient } from './supabase';
import { sharedSnapshot } from './sync-merge';
import { synchronize, type CloudCopy } from './sync-engine';

export type CloudStatus = { state: 'signed-out' | 'unlinked' | 'syncing' | 'synced' | 'offline' | 'error' | 'conflict' | 'deferred'; message: string; at?: string };
let status: CloudStatus = { state: 'signed-out', message: 'Войдите в аккаунт для синхронизации' };
let locked = false;
let generation = 0;
export function getCloudStatus() { return status; }
export function subscribeCloudStatus(fn: () => void) { window.addEventListener('plos-cloud-status', fn); return () => window.removeEventListener('plos-cloud-status', fn); }
export function setCloudStatus(next: CloudStatus) { status = next; window.dispatchEvent(new Event('plos-cloud-status')); }
export function invalidateCloudSync() { generation++; }
async function fetchCopy(userId: string): Promise<CloudCopy | null> {
  const { data, error } = await getSupabaseClient()!.from('user_data').select('payload, updated_at').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (data && !isAppBackup(data.payload)) throw new Error('Облачная копия не прошла проверку. Данные устройства сохранены.');
  return data as CloudCopy | null;
}
async function saveCopy(payload: AppBackup, expected: string | null): Promise<CloudCopy | null> {
  const { data, error } = await getSupabaseClient()!.rpc('plos_save_data', { p_payload: payload, p_expected: expected });
  if (error) throw error;
  return data?.[0] ?? null;
}
function applyCopy(backup: AppBackup) {
  const before = createBackup();
  if (sharedSnapshot(before) === sharedSnapshot(backup)) return;
  localStorage.setItem('plos.sync.recovery.v1', JSON.stringify(before));
  restoreBackup({ ...backup, data: { ...backup.data, timerState: before.data.timerState } });
  window.dispatchEvent(new Event('plos-cloud-applied'));
}
function canApply() { return !document.querySelector('[role="dialog"]') && !document.activeElement?.matches('input,textarea,select,[contenteditable="true"]'); }
function failed(error: unknown) {
  const offline = !navigator.onLine || error instanceof TypeError;
  setCloudStatus({ state: offline ? 'offline' : 'error', message: offline ? 'Нет связи. Изменения сохранены на устройстве и будут отправлены позже.' : `Синхронизация приостановлена: ${error instanceof Error ? error.message : String((error as { message?: string })?.message ?? error)}` });
}
export async function syncNow(userId: string) {
  if (locked) return;
  if (!navigator.onLine) { setCloudStatus({ state: 'offline', message: 'Без интернета. Изменения сохраняются на устройстве.' }); return; }
  locked = true;
  const token = generation;
  try {
    const result = await synchronize({ userId, readLocal: createBackup, readMarker: readSyncMarker,
      fetch: () => fetchCopy(userId), save: saveCopy, active: () => generation === token, canApply,
      commit: (backup, marker) => { applyCopy(backup); writeSyncMarker(marker); } });
    if (generation !== token) return;
    const states: Record<typeof result.state, CloudStatus> = {
      synced: { state: 'synced', message: 'Синхронизировано', at: new Date().toISOString() },
      unlinked: { state: 'unlinked', message: 'Выберите данные для первого подключения устройства.' },
      conflict: { state: 'conflict', message: 'Одна и та же запись изменена на двух устройствах. Скачайте резервную копию и выберите, какую версию оставить.' },
      deferred: { state: 'deferred', message: 'Есть изменения с другого устройства. Они появятся после завершения ввода и закрытия окна.' },
      retry: { state: 'syncing', message: 'Появились новые изменения. Повторная попытка…' },
    };
    setCloudStatus(states[result.state]);
  } catch (error) { if (generation === token) failed(error); }
  finally { locked = false; }
}
/** Explicit pairing also resolves conflicts. A replacement preserves the previous local copy. */
export async function pairDevice(userId: string, source: 'local' | 'cloud'): Promise<boolean> {
  if (locked) return false;
  locked = true;
  const token = generation;
  try {
    const remote = await fetchCopy(userId);
    if (generation !== token) return false;
    if (source === 'cloud' && !remote) throw new Error('В облаке пока нет данных. Сначала подключите Windows и отправьте данные с него.');
    const prompt = source === 'local'
      ? remote ? 'Заменить облачные данные данными этого устройства? Другие устройства получат эту версию. Перед заменой скачайте резервную копию.' : 'Сохранить данные этого устройства в облако и включить синхронизацию?'
      : 'Загрузить облачные данные на это устройство? Предыдущая локальная копия будет сохранена для восстановления.';
    if (!window.confirm(prompt)) return false;
    const local = createBackup();
    const saved = source === 'cloud' ? remote : await saveCopy(local, remote?.updated_at ?? null);
    if (generation !== token) return false;
    if (!saved) throw new Error('Облако изменилось во время подключения. Повторите попытку.');
    if (source === 'cloud') applyCopy(saved.payload);
    writeSyncMarker({ userId, cloudUpdatedAt: saved.updated_at, snapshot: sharedSnapshot(saved.payload) });
    setCloudStatus({ state: 'synced', message: 'Синхронизация включена', at: new Date().toISOString() });
    return true;
  } catch (error) { if (generation === token) failed(error); return false; }
  finally { locked = false; }
}
