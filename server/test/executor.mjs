import { status, execute, resolveRuntime } from "../src/executor.js";
import { runChallenge, getChallenge } from "../src/challenges.js";

const sumSolutions = {
  javascript: "function solution(a, b){ return a + b; }",
  typescript: "function solution(a: number, b: number): number{ return a + b; }",
  python: "def solution(a, b):\n    return a + b",
  c: "long long solution(long long a, long long b){ return a + b; }",
  csharp: "static long solution(long a, long b){ return a + b; }",
};

console.log("== runChallenge (sum, real harness) ==");
const challenge = getChallenge("sum");
for (const lang of ["javascript", "typescript", "python", "c", "csharp"]) {
  const rt = await resolveRuntime(lang);
  if (!rt) { console.log(lang, "skip (no runtime)"); continue; }
  const res = await runChallenge({ language: lang, code: sumSolutions[lang], challenge });
  console.log(lang, JSON.stringify({ status: res.status, passed: res.passed, total: res.total,
    firstErr: res.tests && res.tests.find(t => t.error) && res.tests.find(t => t.error).error, detail: res.detail }));
}

console.log("\n== simple program per language (raw execute) ==");
const samples = {
  javascript: 'console.log("hello " + (6 * 7));',
  typescript: 'const x: number = 6 * 7; console.log("ts " + x);',
  python: 'print("python " + str(6 * 7))',
  c: '#include <stdio.h>\nint main(){ printf("c %d\\n", 6*7); return 0; }',
  csharp: "using System; public static class Program { public static void Main(){ Console.WriteLine(\"cs \" + (6*7)); } }",
};
for (const lang of Object.keys(samples)) {
  const rt = await resolveRuntime(lang);
  if (!rt) continue;
  const r = await execute({ language: lang, content: samples[lang] });
  console.log(lang, r.compile ? { compile: { code: r.compile.code, stderr: r.compile.stderr.slice(0, 300) } } : { run: r.run });
}