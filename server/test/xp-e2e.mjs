import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3391;
const BASE = `http://127.0.0.1:${PORT}`;
const tmp = mkdtempSync(path.join(tmpdir(), "wc-xp-"));
const dbPath = path.join(tmp, "test.db");

const server = spawn(process.env.NODE_BIN || process.execPath, ["src/index.js"], {
  cwd: path.join(__dirname, ".."),
  env: { ...process.env, PORT: String(PORT), DB_PATH: dbPath, JWT_SECRET: "xp-test-secret" },
  stdio: "ignore",
});

async function waitUp() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${BASE}/api/config`);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("servidor não subiu");
}

async function req(method, url, body, cookie) {
  const res = await fetch(`${BASE}${url}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json(), setCookie: res.headers.get("set-cookie") || "" };
}

try {
  await waitUp();

  const reg = await req("POST", "/api/auth/register", {
    email: "xp-test@example.com",
    password: "secret123",
  });
  if (reg.status !== 201) throw new Error("register falhou: " + JSON.stringify(reg.json));
  const cookie = reg.setCookie.split(";")[0];
  console.log("cookie obtido:", Boolean(cookie));

  const sol = "function solution(a, b){ return a + b; }";

  const r1 = await req("POST", "/api/challenges/sum/run", { language: "javascript", code: sol }, cookie);
  console.log("run#1 (login, primeira vez):", JSON.stringify({
    status: r1.json.status, passed: r1.json.passed, total: r1.json.total,
    xpEarned: r1.json.xpEarned, solved: r1.json.solved, level: r1.json.level,
  }));

  const r2 = await req("POST", "/api/challenges/sum/run", { language: "javascript", code: sol }, cookie);
  console.log("run#2 (login, repetida):", JSON.stringify({
    status: r2.json.status, xpEarned: r2.json.xpEarned, solved: r2.json.solved,
  }));

  const r3 = await req("POST", "/api/challenges/sum/run", { language: "javascript", code: sol });
  console.log("run#3 (anônimo):", JSON.stringify({
    status: r3.json.status, passed: r3.json.passed, total: r3.json.total,
    xpEarned: r3.json.xpEarned, solved: r3.json.solved,
  }));

  const ok =
    r1.json.status === "ok" &&
    r1.json.passed === r1.json.total &&
    r1.json.xpEarned > 0 &&
    r1.json.solved === true &&
    r1.json.level != null &&
    r2.json.status === "ok" &&
    r2.json.xpEarned === 0 &&
    r2.json.solved === false &&
    r3.json.status === "ok" &&
    r3.json.xpEarned === 0 &&
    r3.json.solved === false;

  console.log(ok ? "XP_E2E_OK" : "XP_E2E_FAIL");
  process.exitCode = ok ? 0 : 1;
} finally {
  server.kill("SIGTERM");
  rmSync(tmp, { recursive: true, force: true });
}
