import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LANGUAGES } from "./languages.js";
import { githubRandom, githubFromRepo } from "./github.js";
import { generateSnippet, aiConfigured } from "./ai.js";
import { listChallenges, challengeDetail, getChallenge, runChallenge } from "./challenges.js";
import { status as executorStatus } from "./executor.js";
import { initDb, createResult, listResults, grantXp, hasResultToday, hasSolvedChallenge, createChallengeSolve } from "./db.js";
import { levelInfo, xpForResult, DAILY_BONUS } from "./xp.js";
import authRouter, { requireAuth, optionalAuth } from "./auth.js";

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

app.get("/api/challenges/status", async (_req, res) => {
  res.json(await executorStatus());
});

app.get("/api/challenges", async (_req, res) => {
  res.json({ challenges: await listChallenges() });
});

app.get("/api/challenges/:id", async (req, res) => {
  const detail = await challengeDetail(req.params.id);
  if (!detail) return res.status(404).json({ error: "Desafio não encontrado." });
  res.json({ challenge: detail });
});

app.post("/api/challenges/:id/run", optionalAuth, async (req, res) => {
  const challenge = await challengeDetail(req.params.id);
  if (!challenge) return res.status(404).json({ error: "Desafio não encontrado." });
  const { language, code } = req.body || {};
  try {
    const result = await runChallenge({ language, code, challenge: getChallenge(req.params.id) });
    let xpEarned = 0;
    let solved = false;
    if (result.status === "ok" && result.total > 0 && result.passed === result.total && req.user) {
      const already = await hasSolvedChallenge(req.user.id, challenge.id);
      if (!already) {
        const created = await createChallengeSolve(req.user.id, challenge.id, challenge.xp);
        if (created) {
          xpEarned = challenge.xp;
          solved = true;
          await grantXp(req.user.id, xpEarned);
        }
      }
    }
    let level = null;
    if (req.user) {
      const xp = Number(req.user.xp || 0) + (solved ? xpEarned : 0);
      level = levelInfo(xp);
    }
    res.json({ ...result, xpEarned, solved, level });
  } catch (e) {
    console.error(`[/api/challenges/${req.params.id}/run] erro:`, e.message);
    res.status(502).json({ error: e.message });
  }
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
    const baseXp = xpForResult({ cpm: Number(cpm) || 0, accuracy: Number(accuracy) || 0 });
    const bonus = (await hasResultToday(req.user.id)) ? 0 : DAILY_BONUS;
    const xpEarned = baseXp + bonus;
    const result = await createResult({
      userId: req.user.id,
      language: language ? String(language) : null,
      source: source ? String(source) : null,
      cpm: Number(cpm) || 0,
      wpm: Number(wpm) || 0,
      accuracy: Number(accuracy) || 0,
      errors: Math.round(Number(errors)) || 0,
      elapsed: Number(elapsed) || 0,
      xp: xpEarned,
    });
    const xp = await grantXp(req.user.id, xpEarned);
    res.status(201).json({ result, xpEarned, bonus, level: levelInfo(xp) });
  } catch (e) {
    console.error(`[/api/results] erro:`, e.message);
    res.status(500).json({ error: "Falha ao salvar o resultado." });
  }
});

app.get("/api/results", requireAuth, async (req, res) => {
  try {
    const results = await listResults(req.user.id, 50);
    res.json({ results, level: levelInfo(Number(req.user.xp || 0)) });
  } catch (e) {
    console.error(`[/api/results] erro:`, e.message);
    res.status(500).json({ error: "Falha ao listar resultados." });
  }
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, "../../client/dist");

const DEFAULT_SITE_URL = "https://writecode.example.com";
function siteUrl() {
  return (process.env.APP_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");
}

// Carrega o HTML do index (do build ou, em dev, do fonte) para injetar o head SEO.
let indexHtml = "";
for (const p of [path.join(dist, "index.html"), path.resolve(__dirname, "../../client/index.html")]) {
  try {
    indexHtml = fs.readFileSync(p, "utf8");
    break;
  } catch {}
}

// Otimizações de performance: embute o CSS de build e pré-carrega as fontes.
let inlineCss = "";
let fontPreloads = "";
try {
  const assetsDir = path.join(dist, "assets");
  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    const cssFile = files.find((f) => f.startsWith("index-") && f.endsWith(".css"));
    if (cssFile) inlineCss = fs.readFileSync(path.join(assetsDir, cssFile), "utf8");
    fontPreloads = files
      .filter((f) => f.endsWith(".woff2") && f.includes("-latin"))
      .map((f) => `<link rel="preload" as="font" type="font/woff2" href="/assets/${f}" crossorigin />`)
      .join("\n    ");
  }
} catch {}

function seoHead() {
  const base = siteUrl();
  const image = `${base}/og-image.svg`;
  return [
    `<link rel="canonical" href="${base}/" />`,
    `<meta property="og:url" content="${base}/" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="Writecode — Treino de digitação em código" />`,
    `<meta name="twitter:image" content="${image}" />`,
  ].join("\n    ");
}

function sendIndex(_req, res) {
  const config = JSON.stringify({ aiEnabled: aiConfigured(), languages: Object.keys(LANGUAGES) });
  const html = indexHtml
    .replace(/<link rel="stylesheet"[^>]*>/, inlineCss ? `<style>${inlineCss}</style>` : "")
    .replace(
      "</head>",
      `    ${seoHead()}\n    ${fontPreloads}\n    <script>window.__WRITECODE_CONFIG__ = ${config};</script>\n  </head>`
    );
  res.type("html").send(html);
}

app.get("/robots.txt", (_req, res) => {
  res
    .type("text/plain")
    .send(["User-agent: *", "Allow: /", "Disallow: /api/", `Sitemap: ${siteUrl()}/sitemap.xml`].join("\n") + "\n");
});

app.get("/sitemap.xml", (_req, res) => {
  const base = siteUrl();
  res.type("application/xml").send(
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      `  <url>\n    <loc>${base}/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>\n` +
      `</urlset>\n`
  );
});

app.get("/", sendIndex);

app.use(
  express.static(dist, {
    setHeaders(res, filePath) {
      // Assets com hash no nome podem ser cacheados agressivamente.
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else {
        res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      }
    },
  })
);
app.get(/^\/(?!api\/).*/, sendIndex);

if (!process.env.APP_URL) {
  console.warn(
    `[seo] APP_URL não definido; usando "${DEFAULT_SITE_URL}" para canonical/OG/sitemap. Definir APP_URL na produção.`
  );
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Writecode server on http://localhost:${PORT}`);
});
