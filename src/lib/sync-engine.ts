import { isAppBackup, type AppBackup, type SyncMarker } from './backup';
import { mergeBackups, sharedSnapshot } from './sync-merge';
export type CloudCopy = { payload: AppBackup; updated_at: string };
export type SyncResult = { state: 'synced' | 'unlinked' | 'conflict' | 'deferred' | 'retry'; conflicts?: string[] };
export type SyncPort = {
  userId: string; readLocal: () => AppBackup; readMarker: () => SyncMarker | null;
  fetch: () => Promise<CloudCopy | null>; save: (payload: AppBackup, expected: string | null) => Promise<CloudCopy | null>;
  commit: (backup: AppBackup, marker: SyncMarker) => void; active: () => boolean; canApply: () => boolean;
};
/** Network failures leave local storage and baseline intact; the next pass retries. */
export async function synchronize(port: SyncPort): Promise<SyncResult> {
  const marker = port.readMarker();
  if (!marker || marker.userId !== port.userId) return { state: 'unlinked' };
  const remote = await port.fetch();
  if (!port.active()) return { state: 'retry' };
  if (!remote) return { state: 'conflict', conflicts: ['Облачная копия удалена'] };
  if (!isAppBackup(remote.payload)) throw new Error('Неверный формат облачных данных. Локальные данные сохранены.');
  const local = port.readLocal();
  const merged = mergeBackups(marker.snapshot, local, remote.payload);
  if (merged.conflicts.length) return { state: 'conflict', conflicts: merged.conflicts };
  if (sharedSnapshot(local) !== sharedSnapshot(merged.backup) && !port.canApply()) return { state: 'deferred' };
  let saved = remote;
  if (sharedSnapshot(merged.backup) !== sharedSnapshot(remote.payload)) {
    const result = await port.save(merged.backup, remote.updated_at);
    if (!result) return { state: 'retry' };
    saved = result;
  }
  if (!port.active()) return { state: 'retry' };
  // Keep edits made while the request was in flight; send them on the next pass.
  const latest = port.readLocal();
  const after = mergeBackups(sharedSnapshot(local), latest, merged.backup);
  if (after.conflicts.length) return { state: 'retry' };
  if (sharedSnapshot(latest) !== sharedSnapshot(after.backup) && !port.canApply()) return { state: 'deferred' };
  port.commit(after.backup, { userId: port.userId, cloudUpdatedAt: saved.updated_at, snapshot: sharedSnapshot(saved.payload) });
  return { state: 'synced' };
}
