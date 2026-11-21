import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../out");
const port = Number(process.env.PORT || 3000);
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".woff2": "font/woff2", ".xml": "application/xml" };
try { await stat(path.join(root, "planner/index.html")); }
catch { console.error("Build the app first: npm ci && npm run build"); process.exit(1); }
const server = http.createServer(async (req, res) => {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); res.end(); return; }
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    let file = path.resolve(root, `.${pathname}`);
    if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403); res.end(); return; }
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    const content = await readFile(file);
    res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(req.method === "HEAD" ? undefined : content);
  } catch { res.writeHead(404); res.end("Not found"); }
});
server.on("error", (error) => {
  console.error(error.code === "EADDRINUSE" ? `Port ${port} is in use. Close the other preview window or use a different PORT.` : error.message);
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () => {
  const url = `http://127.0.0.1:${port}/planner/`;
  console.log(`Personal Learning OS: ${url}\nKeep this window open. Press Ctrl+C to stop.`);
  if (process.argv.includes("--open") && process.platform === "win32") spawn("cmd.exe", ["/c", "start", "", url], { windowsHide: true, stdio: "ignore" }).unref();
});
