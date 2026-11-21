import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const run = (command, argv) => {
  const result = spawnSync(command, argv, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};
if (!args.includes('--skip-web')) {
  run('npm', ['run', 'build']);
  run('npx', ['cap', 'sync', 'android']);
}
const wrapper = process.platform === 'win32' ? 'android\\gradlew.bat' : './android/gradlew';
run(wrapper, ['-p', 'android', '--no-daemon', 'assembleDebug']);
const destination = path.join(root, 'release/Personal-Learning-OS-Android-test.apk');
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.copyFileSync(path.join(root, 'android/app/build/outputs/apk/debug/app-debug.apk'), destination);
console.log(`APK: ${destination}`);
