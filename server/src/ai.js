import { LANGUAGES } from "./languages.js";
import { normalize } from "./snippets.js";

const BASE = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export function aiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

const DIFFS = {
  easy: { label: "fácil", size: "approximately 8 to 14 lines" },
  medium: { label: "médio", size: "approximately 18 to 30 lines" },
  hard: { label: "difícil", size: "approximately 30 to 45 lines" },
};

export async function generateSnippet(language, difficulty) {
  const diff = DIFFS[difficulty] || DIFFS.medium;
  const cfg = LANGUAGES[language];
  if (!cfg) throw new Error("Linguagem não suportada.");

  const prompt = `Write a realistic, self-contained code snippet in ${cfg.aiName} for typing practice.
- It must be ${diff.size}.
- It must contain real logic: a function or small program with variables, control flow, and meaningful behavior. No placeholder comments like "TODO" or "write code here".
- Include a variety of characters: braces, parentheses, operators, quotes, semicolons (if applicable), and punctuation.
- Use 4 spaces for indentation. Do not use tabs.
- Output ONLY the raw code. No markdown code fences, no explanation, no surrounding text.`;

  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Falha na geração com IA: ${res.status} ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  let code = data.choices?.[0]?.message?.content || "";
  code = code.replace(/```[a-zA-Z0-9]*\s*/g, "").replace(/```/g, "").trim();
  if (!code) {
    throw new Error("A IA não retornou código.");
  }
  return normalize(code);
}
