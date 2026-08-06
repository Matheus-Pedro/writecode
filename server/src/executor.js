import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const TSC_PATH = path.join(ROOT, "node_modules", "typescript", "lib", "tsc.js");

export const DEFAULT_MEMORY_MB = Number(process.env.EXEC_MEMORY_MB || 512);
export const DEFAULT_RUN_TIMEOUT = Number(process.env.EXEC_RUN_TIMEOUT || 8000);
export const DEFAULT_COMPILE_TIMEOUT = Number(process.env.EXEC_COMPILE_TIMEOUT || 20000);
export const MAX_OUTPUT = 64 * 1024;

let runtimesCache = null;
let runtimesAt = 0;
const TTL = 10 * 60 * 1000;

let useNetIsolation = false;

async function tryNetIsolation() {
  if (process.platform !== "linux") return false;
  if (process.getuid && process.getuid() !== 0) return false;
  try {
    const { ok } = await execFileSafe("unshare", ["-n", "true"]);
    return ok;
  } catch {
    return false;
  }
}

async function versionOf(cmd, args = ["--version"]) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("error", () => resolve(null));
    child.on("close", () => resolve(out.trim().split("\n")[0] || "?"));
    setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {}
    }, 3000).unref();
  });
}

function execFileSafe(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    child.on("error", () => resolve({ ok: false }));
    child.on("close", (code) => resolve({ ok: code === 0 }));
  });
}

async function has(cmd) {
  const { ok } = await execFileSafe(cmd, ["--version"]);
  return ok;
}

async function detect() {
  const list = [];
  const node = await has("node");
  if (node) {
    list.push({ language: "javascript", version: (await versionOf("node")) || "?", aliases: ["js", "node"] });
  }

  const python = await has("python3");
  if (python) list.push({ language: "python", version: (await versionOf("python3")) || "?", aliases: ["py", "python"] });

  const ruby = await has("ruby");
  if (ruby) list.push({ language: "ruby", version: (await versionOf("ruby")) || "?", aliases: [] });

  const php = await has("php");
  if (php) list.push({ language: "php", version: (await versionOf("php")) || "?", aliases: [] });

  const gcc = await has("gcc");
  if (gcc) list.push({ language: "c", version: (await versionOf("gcc")) || "?", aliases: [] });

  const go = await has("go");
  if (go) list.push({ language: "go", version: (await versionOf("go")) || "?", aliases: [] });

  const rustc = await has("rustc");
  if (rustc) list.push({ language: "rust", version: (await versionOf("rustc")) || "?", aliases: [] });

  const javac = await has("javac");
  if (javac) list.push({ language: "java", version: (await versionOf("javac")) || "?", aliases: [] });

  const dotnet = await has("dotnet");
  if (dotnet) list.push({ language: "csharp", version: (await versionOf("dotnet")) || "?", aliases: ["cs", "dotnet"] });

  if (node && fs.existsSync(TSC_PATH)) {
    list.push({ language: "typescript", version: "tsc", aliases: ["ts"] });
  }

  return list;
}

export async function getRuntimesList() {
  const now = Date.now();
  if (!runtimesCache || now - runtimesAt > TTL) {
    runtimesCache = await detect();
    runtimesAt = now;
    useNetIsolation = await tryNetIsolation();
  }
  return runtimesCache;
}

export function isConfigured() {
  return true;
}

export async function resolveRuntime(language) {
  const list = await getRuntimesList();
  const entry = list.find((r) => r.language === language || (Array.isArray(r.aliases) && r.aliases.includes(language)));
  return entry ? { language: entry.language, version: entry.version } : null;
}

export async function status() {
  const runtimes = await getRuntimesList();
  return {
    ok: true,
    engine: "local-executor",
    netIsolation: useNetIsolation,
    runtimes: runtimes.map((r) => ({ language: r.language, version: r.version })),
  };
}

// ------------------------------------------------------------------ sandbox

function runProcess(cmd, args, { cwd, timeoutMs, memoryMb, uid, uncapped = false }) {
  return new Promise((resolve) => {
    const memKb = Math.max(16, Math.round(memoryMb * 1024));
    const ulimitV = uncapped ? "" : `ulimit -v ${memKb} 2>/dev/null; `;
    const inner = `${ulimitV}exec "$@"`;
    const opts = { cwd, stdio: ["ignore", "pipe", "pipe"] };
    opts.env = {
      ...process.env,
      HOME: cwd,
      DOTNET_CLI_TELEMETRY_OPTOUT: "1",
      DOTNET_SKIP_FIRST_TIME_EXPERIENCE: "1",
      DOTNET_NOLOGO: "1",
    };
    if (typeof uid === "number" && process.getuid && process.getuid() === 0) {
      opts.uid = uid;
    }
    let child;
    try {
      if (useNetIsolation) {
        child = spawn("unshare", ["-n", "sh", "-c", inner, "sh", cmd, ...args], opts);
      } else {
        child = spawn("sh", ["-c", inner, "sh", cmd, ...args], opts);
      }
    } catch (e) {
      resolve({ stdout: "", stderr: String(e && e.message), code: 127 });
      return;
    }
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    child.stdout.on("data", (d) => {
      if (stdout.length < MAX_OUTPUT) stdout += d;
    });
    child.stderr.on("data", (d) => {
      if (stderr.length < MAX_OUTPUT) stderr += d;
    });
    child.on("error", (e) => {
      resolve({ stdout, stderr: String(e && e.message), code: 127 });
    });
    child.on("close", (code, signal) => {
      resolve({ stdout, stderr, code: timedOut ? 124 : code ?? (signal ? 128 : 1), timedOut });
    });
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill("SIGKILL");
      } catch {}
    }, timeoutMs);
    timer.unref();
  });
}

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wc-exec-"));
  fs.chmodSync(dir, 0o777);
  return dir;
}

function cleanupDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {}
}

export async function execute({
  language,
  content,
  stdin = "",
  args = [],
  compileTimeout = DEFAULT_COMPILE_TIMEOUT,
  runTimeout = DEFAULT_RUN_TIMEOUT,
  memoryMb = DEFAULT_MEMORY_MB,
}) {
  const rt = await resolveRuntime(language);
  if (!rt) throw new Error(`Runtime "${language}" indisponível no servidor.`);

  const dir = makeTempDir();
  const uid = 65534; // nobody
  const spec = SPECS[rt.language];
  if (!spec) {
    cleanupDir(dir);
    throw new Error(`Linguagem "${language}" não suportada pelo executor.`);
  }

  const uncapped = !!spec.uncapped;
  const filePath = path.join(dir, spec.file);
  try {
    fs.writeFileSync(filePath, content, { mode: 0o644 });

    // compilação, se houver
    if (spec.compile) {
      const compileArgs = await spec.compile(dir, args);
      const compile = await runProcess(compileArgs[0], compileArgs.slice(1), {
        cwd: dir,
        timeoutMs: compileTimeout,
        memoryMb: memoryMb * 2,
        uid,
        uncapped,
      });
      if (compile.code !== 0) {
        return { compile, run: null };
      }
    }

    const runArgs = await spec.run(dir, args);
    const run = await runProcess(runArgs[0], runArgs.slice(1), {
      cwd: dir,
      timeoutMs: runTimeout,
      memoryMb,
      uid,
      uncapped,
    });

    if (run.timedOut) run.stdout += "\n[executor] Tempo esgotado.";
    return { run };
  } catch (e) {
    return { run: { stdout: "", stderr: String(e && e.message), code: 1 } };
  } finally {
    cleanupDir(dir);
  }
}

function dotnetProject(dir) {
  const csproj = `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net9.0</TargetFramework>
    <Nullable>disable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <InvariantGlobalization>true</InvariantGlobalization>
  </PropertyGroup>
</Project>
`;
  fs.writeFileSync(path.join(dir, "cstest.csproj"), csproj, { mode: 0o644 });
}

const SPECS = {
  javascript: {
    file: "main.js",
    async run() {
      return ["node", "main.js"];
    },
  },
  typescript: {
    file: "main.ts",
    async compile(dir) {
      return ["node", TSC_PATH, "main.ts", "--outDir", "out", "--skipLibCheck", "--target", "es2020", "--module", "commonjs"];
    },
    async run() {
      return ["node", "out/main.js"];
    },
  },
  python: {
    file: "main.py",
    async run() {
      return ["python3", "main.py"];
    },
  },
  ruby: {
    file: "main.rb",
    async run() {
      return ["ruby", "main.rb"];
    },
  },
  php: {
    file: "main.php",
    async run() {
      return ["php", "main.php"];
    },
  },
  c: {
    file: "main.c",
    async compile() {
      return ["gcc", "main.c", "-o", "main", "-lm", "-O2"];
    },
    async run() {
      return ["./main"];
    },
  },
  csharp: {
    file: "Program.cs",
    uncapped: true,
    async compile(dir) {
      dotnetProject(dir);
      return ["dotnet", "build", "cstest.csproj", "-c", "Release", "--nologo", "-v", "q"];
    },
    async run() {
      return ["dotnet", "bin/Release/net9.0/cstest.dll"];
    },
  },
  java: {
    file: "Main.java",
    async compile() {
      return ["javac", "Main.java"];
    },
    async run() {
      return ["java", "Main"];
    },
  },
  go: {
    file: "main.go",
    async compile() {
      return ["go", "build", "-o", "main", "main.go"];
    },
    async run() {
      return ["./main"];
    },
  },
  rust: {
    file: "main.rs",
    async compile() {
      return ["rustc", "main.rs", "-O", "-o", "main"];
    },
    async run() {
      return ["./main"];
    },
  },
};