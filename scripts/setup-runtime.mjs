import fs from 'node:fs/promises';import path from 'node:path';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');let installed=false;try{await fs.access(path.join(root,'node_modules/electron/path.txt'));installed=true;}catch{}
if(!installed){const r=spawnSync(process.execPath,[path.join(root,'node_modules/electron/install.js')],{cwd:root,stdio:'inherit',windowsHide:true});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status||1);}
console.log('Electron runtime is ready.');
