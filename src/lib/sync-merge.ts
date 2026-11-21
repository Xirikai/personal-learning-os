import { isAppBackup, type AppBackup } from './backup';
import { emptyPlanner } from './smart-planner';
import { emptyWorkspace } from './workspace';

/** Canonical equality ignores object property order, never array order. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'undefined';
}
export function sharedData(backup: AppBackup) {
  const { timerState: _timer, ...data } = backup.data;
  return { ...data, planner: data.planner ?? emptyPlanner(), workspace: data.workspace ?? emptyWorkspace() };
}
export function sharedSnapshot(backup: AppBackup): string { return canonical(sharedData(backup)); }

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const identified = (v: unknown): v is { id: string }[] => Array.isArray(v) && v.every((item) => record(item) && typeof item.id === 'string') && new Set(v.map((i) => i.id)).size === v.length;

/** Three-way merge: independent edits and deletions merge; competing edits stay explicit. */
export function mergeBackups(baseSnapshot: string, local: AppBackup, remote: AppBackup): { backup: AppBackup; conflicts: string[] } {
  const base: unknown = JSON.parse(baseSnapshot);
  if (!record(base) || !isAppBackup({ ...local, data: { ...base, timerState: local.data.timerState } })) throw new Error('Повреждена основа синхронизации. Подключите устройство заново.');
  const normalizedBase = sharedData({ ...local, data: { ...base, timerState: local.data.timerState } } as AppBackup);
  const conflicts: string[] = [];
  const merge = (b: unknown, l: unknown, r: unknown, path: string): unknown => {
    if (canonical(l) === canonical(r)) return l;
    if (canonical(l) === canonical(b)) return r;
    if (canonical(r) === canonical(b)) return l;
    if (identified(b) && identified(l) && identified(r)) {
      const bm = new Map(b.map((v) => [v.id, v])), lm = new Map(l.map((v) => [v.id, v])), rm = new Map(r.map((v) => [v.id, v]));
      return [...new Set([...r.map((v) => v.id), ...l.map((v) => v.id), ...b.map((v) => v.id)])]
        .map((id) => merge(bm.get(id), lm.get(id), rm.get(id), `${path}/${id}`)).filter((v) => v !== undefined);
    }
    if (record(b) && record(l) && record(r)) {
      return Object.fromEntries([...new Set([...Object.keys(b), ...Object.keys(l), ...Object.keys(r)])]
        .map((key) => [key, merge(b[key], l[key], r[key], `${path}/${key}`)]).filter(([, v]) => v !== undefined));
    }
    conflicts.push(path);
    return l;
  };
  const data = merge(normalizedBase, sharedData(local), sharedData(remote), '') as ReturnType<typeof sharedData>;
  const backup: AppBackup = { ...local, data: { ...data, timerState: local.data.timerState } };
  if (!conflicts.length && !isAppBackup(backup)) throw new Error('Объединённые данные не прошли проверку. Исходные копии сохранены.');
  return { backup, conflicts };
}
