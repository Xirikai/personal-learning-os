import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
const compile = spawnSync(process.execPath, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.test.json"], { stdio: "inherit" });
if (compile.status !== 0) process.exit(compile.status ?? 1);
const files = readdirSync(".test-build/tests").filter((f) => f.endsWith(".test.js")).map((f) => `.test-build/tests/${f}`);
const tests = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
process.exit(tests.status ?? 1);
