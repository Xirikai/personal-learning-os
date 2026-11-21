import test from 'node:test';
import assert from 'node:assert/strict';
import { type AppBackup, type SyncMarker } from '../src/lib/backup';
import { mergeBackups, sharedSnapshot } from '../src/lib/sync-merge';
import { synchronize, type CloudCopy, type SyncPort } from '../src/lib/sync-engine';
import { emptyPlanner } from '../src/lib/smart-planner';
import { emptyWorkspace } from '../src/lib/workspace';

function backup(): AppBackup {
  return { format: 'personal-learning-os-backup', version: 1, createdAt: '2026-11-21T00:00:00Z', data: {
    tasks: [{ id: 't1', title: 'Первый', subject: 'Math', due: '2026-11-21', createdAt: 1, done: false }],
    notes: [], sessions: [], habits: [], goals: [], theme: 'light',
    timerSettings: { focusMin: 25, shortMin: 5, longMin: 15, longEvery: 4 },
    timerState: { phase: 'focus', status: 'idle', durationMs: 1500000, remainingMs: 1500000, endsAt: null, cycle: 0, label: '', taskId: null, pending: null },
    planner: emptyPlanner(), workspace: emptyWorkspace(),
  } };
}
const copy = <T>(v: T): T => structuredClone(v);
test('offline edits to different records merge without loss', () => {
  const b = backup(), l = copy(b), r = copy(b);
  l.data.tasks[0].done = true;
  r.data.notes.push({ id: 'n', title: 'Phone', content: 'Text', tags: [], createdAt: 1 });
  const result = mergeBackups(sharedSnapshot(b), l, r);
  assert.deepEqual(result.conflicts, []); assert.equal(result.backup.data.tasks[0].done, true); assert.equal(result.backup.data.notes.length, 1);
});
test('independent fields on one task merge', () => {
  const b = backup(), l = copy(b), r = copy(b); l.data.tasks[0].done = true; r.data.tasks[0].title = 'Changed';
  const result = mergeBackups(sharedSnapshot(b), l, r);
  assert.equal(result.conflicts.length, 0); assert.equal(result.backup.data.tasks[0].title, 'Changed'); assert.equal(result.backup.data.tasks[0].done, true);
});
test('competing edits stop instead of silently selecting a winner', () => {
  const b = backup(), l = copy(b), r = copy(b); l.data.tasks[0].title = 'Laptop'; r.data.tasks[0].title = 'Phone';
  assert.deepEqual(mergeBackups(sharedSnapshot(b), l, r).conflicts, ['/tasks/t1/title']);
});
test('deletion propagates when remote record is unchanged', () => {
  const b = backup(), l = copy(b); l.data.tasks = [];
  assert.deepEqual(mergeBackups(sharedSnapshot(b), l, b).backup.data.tasks, []);
});
test('delete versus edit is a conflict and does not resurrect silently', () => {
  const b = backup(), l = copy(b), r = copy(b); l.data.tasks = []; r.data.tasks[0].title = 'Edited';
  assert.deepEqual(mergeBackups(sharedSnapshot(b), l, r).conflicts, ['/tasks/t1']);
});
test('timer stays local and does not dirty cloud snapshot', () => {
  const b = backup(), l = copy(b); l.data.timerState.status = 'running'; l.data.timerState.endsAt = 123456;
  assert.equal(sharedSnapshot(b), sharedSnapshot(l));
  assert.equal(mergeBackups(sharedSnapshot(b), l, b).backup.data.timerState.status, 'running');
});
test('old backups without planner/workspace and old markers remain readable', () => {
  const b = backup(); delete b.data.planner; delete b.data.workspace;
  assert.equal(mergeBackups(JSON.stringify(b.data), b, backup()).conflicts.length, 0);
});
test('calendar entries added on both devices are retained', () => {
  const b = backup(), l = copy(b), r = copy(b);
  const e = { id: 'a', title: 'A', start: '2026-11-21T12:00', end: '2026-11-21T13:00', category: 'study' as const, repeat: 'none' as const, note: '' };
  l.data.workspace!.events.push(e); r.data.workspace!.events.push({ ...e, id: 'b' });
  const result = mergeBackups(sharedSnapshot(b), l, r); assert.equal(result.conflicts.length, 0); assert.equal(result.backup.data.workspace!.events.length, 2);
});

function device() {
  let local = backup(), cloud: CloudCopy = { payload: backup(), updated_at: 'v1' };
  let marker: SyncMarker | null = { userId: 'user', cloudUpdatedAt: 'v1', snapshot: sharedSnapshot(local) };
  let writes = 0, commits = 0;
  const port: SyncPort = { userId: 'user', readLocal: () => copy(local), readMarker: () => copy(marker), fetch: async () => copy(cloud),
    save: async (payload, expected) => { assert.equal(expected, cloud.updated_at); writes++; cloud = { payload: copy(payload), updated_at: `v${writes + 1}` }; return copy(cloud); },
    commit: (next, m) => { local = copy(next); marker = copy(m); commits++; }, active: () => true, canApply: () => true };
  return { port, local: () => local, cloud: () => cloud, marker: () => marker, writes: () => writes, commits: () => commits,
    edit: (fn: (b: AppBackup) => void) => fn(local), remote: (fn: (b: AppBackup) => void) => { fn(cloud.payload); cloud.updated_at = 'remote'; } };
}
test('two device round trip sends local edits and fetches remote edits', async () => {
  const d = device(); d.edit((b) => { b.data.tasks[0].done = true; });
  assert.equal((await synchronize(d.port)).state, 'synced'); assert.equal(d.cloud().payload.data.tasks[0].done, true);
  d.remote((b) => { b.data.tasks[0].title = 'From phone'; });
  await synchronize(d.port); assert.equal(d.local().data.tasks[0].title, 'From phone');
  const count = d.writes(); await synchronize(d.port); assert.equal(d.writes(), count);
});
test('network failure leaves persisted edits and baseline intact for reconnect', async () => {
  const d = device(); d.edit((b) => { b.data.tasks[0].done = true; });
  const save = d.port.save; d.port.save = async () => { throw new TypeError('offline'); };
  await assert.rejects(synchronize(d.port), /offline/); assert.equal(d.commits(), 0); assert.equal(d.marker()!.cloudUpdatedAt, 'v1');
  d.port.save = save; await synchronize(d.port); assert.equal(d.cloud().payload.data.tasks[0].done, true);
});
test('optimistic write race retries without replacing local data', async () => {
  const d = device(); d.edit((b) => { b.data.tasks[0].done = true; }); d.port.save = async () => null;
  assert.equal((await synchronize(d.port)).state, 'retry'); assert.equal(d.commits(), 0); assert.equal(d.local().data.tasks[0].done, true);
});
test('edits during upload remain pending for the next pass', async () => {
  const d = device(); d.edit((b) => { b.data.tasks[0].done = true; }); const save = d.port.save;
  d.port.save = async (...args) => { d.edit((b) => { b.data.tasks[0].title = 'While uploading'; }); return save(...args); };
  await synchronize(d.port); assert.equal(d.local().data.tasks[0].title, 'While uploading');
  d.port.save = save; await synchronize(d.port); assert.equal(d.cloud().payload.data.tasks[0].title, 'While uploading');
});
test('editing a form defers applying remote changes', async () => {
  const d = device(); d.remote((b) => { b.data.tasks[0].title = 'Remote'; }); d.port.canApply = () => false;
  assert.equal((await synchronize(d.port)).state, 'deferred'); assert.equal(d.commits(), 0);
  d.port.canApply = () => true; await synchronize(d.port); assert.equal(d.local().data.tasks[0].title, 'Remote');
});
test('switching accounts while fetching blocks all local commits', async () => {
  const d = device(); d.port.active = () => false;
  assert.equal((await synchronize(d.port)).state, 'retry'); assert.equal(d.commits(), 0); assert.equal(d.writes(), 0);
});
test('an unpaired account never receives local data automatically', async () => {
  const d = device(); d.port.userId = 'other';
  assert.equal((await synchronize(d.port)).state, 'unlinked'); assert.equal(d.writes(), 0);
});
test('conflicting offline edits keep both copies unchanged', async () => {
  const d = device(); d.edit((b) => { b.data.tasks[0].title = 'Laptop'; }); d.remote((b) => { b.data.tasks[0].title = 'Phone'; });
  assert.equal((await synchronize(d.port)).state, 'conflict'); assert.equal(d.writes(), 0); assert.equal(d.commits(), 0);
});
