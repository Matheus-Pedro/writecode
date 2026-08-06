import fs from "node:fs";
import { runChallenge, getChallenge } from "../src/challenges.js";

const [challengeId, language, file] = process.argv.slice(2);

if (!challengeId || !language || !file) {
  console.error("uso: node test/solve.mjs <challenge> <language> <caminho/do/arquivo>");
  console.error("ex.: node test/solve.mjs sum javascript sol.js");
  process.exit(1);
}

const challenge = getChallenge(challengeId);
if (!challenge) {
  console.error(`desafio "${challengeId}" não encontrado`);
  process.exit(1);
}

const code = fs.readFileSync(file, "utf8");
const res = await runChallenge({ language, code, challenge });

console.log(
  JSON.stringify(
    {
      status: res.status,
      passed: res.passed,
      total: res.total,
      tests: res.tests?.map((t) =>
        t.error
          ? { passed: t.passed, error: t.error }
          : { passed: t.passed, input: t.input, got: t.got }
      ),
      detail: res.detail,
    },
    null,
    2
  )
);
