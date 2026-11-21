import fs from 'node:fs/promises';
await fs.mkdir('android/app/src/main/assets/licenses',{recursive:true});
await fs.cp('licenses','android/app/src/main/assets/licenses',{recursive:true});
await fs.copyFile('LICENSE','android/app/src/main/assets/licenses/PROJECT-LICENSE.txt');
await fs.copyFile('THIRD-PARTY.md','android/app/src/main/assets/licenses/THIRD-PARTY.md');
