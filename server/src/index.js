import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LANGUAGES } from "./languages.js";
import { githubRandom, githubFromRepo } from "./github.js";
import { generateSnippet, aiConfigured } from "./ai.js";
import { initDb, createResult, listResults } from "./db.js";
import authRouter, { requireAuth } from "./auth.js";

await initDb();

const app = express();
app.use(
  cors({
    origin: process.env.APP_URL || true,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/api/config", (req, res) => {
  res.json({ aiEnabled: aiConfigured(), languages: Object.keys(LANGUAGES) });
});

app.use("/api/auth", authRouter);

app.get("/api/github/random", async (req, res) => {
  const { language } = req.query;
  try {
    res.json(await githubRandom(language));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.get("/api/github/from-repo", async (req, res) => {
  const { language, repo } = req.query;
  const parts = String(repo || "")
    .trim()
    .split("/")
    .filter(Boolean);
  if (parts.length !== 2) {
    return res.status(400).json({ error: "Formato de repositório inválido. Use owner/repo." });
  }
  try {
    res.json(await githubFromRepo(language, parts[0], parts[1]));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.post("/api/ai", requireAuth, async (req, res) => {
  const { language, difficulty } = req.body || {};
  if (!aiConfigured()) {
    return res.status(400).json({ error: "LLM não configurado. Defina LLM_API_KEY." });
  }
  try {
    res.json(await generateSnippet(language, difficulty));
  } catch (e) {
    console.error(`[/api/ai] erro:`, e.message);
    res.status(502).json({ error: e.message });
  }
});

app.post("/api/results", requireAuth, async (req, res) => {
  const { language = null, source = null, cpm, wpm, accuracy, errors, elapsed } = req.body || {};
  try {
    const result = await createResult({
      userId: req.user.id,
      language: language ? String(language) : null,
      source: source ? String(source) : null,
      cpm: Number(cpm) || 0,
      wpm: Number(wpm) || 0,
      accuracy: Number(accuracy) || 0,
      errors: Math.round(Number(errors)) || 0,
      elapsed: Number(elapsed) || 0,
    });
    res.status(201).json({ result });
  } catch (e) {
    console.error(`[/api/results] erro:`, e.message);
    res.status(500).json({ error: "Falha ao salvar o resultado." });
  }
});

app.get("/api/results", requireAuth, async (req, res) => {
  try {
    res.json({ results: await listResults(req.user.id, 50) });
  } catch (e) {
    console.error(`[/api/results] erro:`, e.message);
    res.status(500).json({ error: "Falha ao listar resultados." });
  }
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, "../../client/dist");
app.use(express.static(dist));
app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(dist, "index.html"));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Writecode server on http://localhost:${PORT}`);
});
