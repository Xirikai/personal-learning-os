const { app, BrowserWindow, dialog, shell } = require('electron');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const PORT = 31987;
app.setName('Personal Learning OS');
let server;
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { const win = BrowserWindow.getAllWindows()[0]; if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(async () => {
    const root = app.isPackaged ? path.join(process.resourcesPath, 'out') : path.resolve(__dirname, '../out');
    const mime = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.txt': 'text/plain', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
    server = http.createServer(async (req, res) => {
      try {
        if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
        const pathname = decodeURIComponent(new URL(req.url, `http://127.0.0.1:${PORT}`).pathname);
        let file = path.resolve(root, `.${pathname}`);
        if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
        if ((await fs.stat(file)).isDirectory()) file = path.join(file, 'index.html');
        const content = await fs.readFile(file);
        res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
        res.end(req.method === 'HEAD' ? undefined : content);
      } catch { res.writeHead(404); res.end('Not found'); }
    });
    try { await new Promise((resolve, reject) => { server.once('error', reject); server.listen(PORT, '127.0.0.1', resolve); }); }
    catch (error) { dialog.showErrorBox('Personal Learning OS', `Не удалось запустить приложение: ${error.message}`); app.quit(); return; }
    const window = new BrowserWindow({ width: 1280, height: 900, minWidth: 360, minHeight: 600, title: 'Personal Learning OS', backgroundColor: '#0f172a', autoHideMenuBar: true, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } });
    const origin = `http://127.0.0.1:${PORT}`;
    window.webContents.on('will-navigate', (event, url) => {
      if (!url.startsWith(origin + '/')) { event.preventDefault(); if (url.startsWith('https://')) shell.openExternal(url); }
    });
    window.webContents.setWindowOpenHandler(({ url }) => { if (url.startsWith('https://')) shell.openExternal(url); return { action: 'deny' }; });
    window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    await window.loadURL(origin + '/');
  });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', () => server?.close());
}
