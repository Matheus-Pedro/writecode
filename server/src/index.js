import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LANGUAGES } from "./languages.js";
import { githubRandom, githubFromRepo } from "./github.js";
import { generateSnippet, aiConfigured } from "./ai.js";
import { initDb, createResult, listResults, grantXp, hasResultToday } from "./db.js";
import { levelInfo, xpForResult, DAILY_BONUS } from "./xp.js";
import authRouter, { requireAuth, publicUser } from "./auth.js";
import {
  dayKey,
  wordForTheDay,
  randomWord,
  letterFeedback,
  hintsFor,
  computeStats,
  MAX_ATTEMPTS,
} from "./daily.js";
import { evaluate, unlockedCount } from "./achievements.js";
import {
  getDailySolve,
  setDailyAttempt,
  recordDailySolve,
  allDailySolves,
  listDailySolves,
  aggregateResults,
  leaderboardGlobal,
  findUserById,
  findUserByLogin,
  advancedStats,
} from "./db.js";
import { createRoom, getRoom, joinRoom, updateProgress, completePlay, startRoom, playAgain, roomState, listPublicRooms } from "./rooms.js";
import { listInterviewProblems, interviewSnippet, interviewLanguages } from "./interview.js";

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

app.get("/api/achievements", requireAuth, async (req, res) => {
  try {
    const agg = await aggregateResults(req.user.id);
    const list = evaluate(agg);
    res.json({ unlocked: unlockedCount(list), total: list.length, achievements: list });
  } catch (e) {
    console.error(`[/api/achievements] erro:`, e.message);
    res.status(500).json({ error: "Falha ao carregar conquistas." });
  }
});

app.get("/api/stats", requireAuth, async (req, res) => {
  try {
    const agg = await aggregateResults(req.user.id);
    const byLang = await advancedStats(req.user.id);
    res.json({
      unique: {
        totalRaces: agg.total,
        bestWpm: Math.round(agg.bestWpm * 100) / 100,
        bestAccuracy: Math.round(agg.bestAcc * 1000) / 10,
        languages: agg.languages,
      },
      byLang,
    });
  } catch (e) {
    console.error(`[/api/stats] erro:`, e.message);
    res.status(500).json({ error: "Falha ao carregar estatísticas." });
  }
});

const PERIOD_DAYS = { daily: 1, weekly: 7, monthly: 30, all: 0 };
app.get("/api/ranking", async (req, res) => {
  try {
    const period = String(req.query.period || "all");
    const days = PERIOD_DAYS[period] ?? 0;
    const rows = await leaderboardGlobal(days);
    const ranking = rows.map((r, i) => ({
      rank: i + 1,
      id: r.id,
      name: r.name || r.github_login || `#${r.id}`,
      avatarUrl: r.avatar_url,
      bestWpm: Math.round(Number(r.best_wpm) || 0),
      avgAccuracy: Number(r.avg_acc || 0),
      races: Number(r.races || 0),
      xp: Number(r.xp || 0),
    }));
    res.json({ period, ranking });
  } catch (e) {
    console.error(`[/api/ranking] erro:`, e.message);
    res.status(500).json({ error: "Falha ao carregar o ranking." });
  }
});

app.get("/api/users/:ref", async (req, res) => {
  try {
    const ref = String(req.params.ref || "").trim();
    const isNum = /^\d+$/.test(ref);
    const user = isNum ? await findUserById(ref) : await findUserByLogin(ref);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
    const agg = await aggregateResults(user.id);
    const history = await listResults(user.id, 20);
    const achievements = evaluate(agg);
    const ranked = await leaderboardGlobal(0);
    const myIndex = ranked.findIndex((r) => Number(r.id) === Number(user.id));
    const favEntry = Object.entries(agg.langs || {}).sort((a, b) => b[1] - a[1])[0];
    const xp = Number(user.xp || 0);
    res.json({
      profile: {
        id: user.id,
        name: user.name || user.github_login || `#${user.id}`,
        avatarUrl: user.avatar_url,
        xp,
        level: levelInfo(xp).level,
        totalRaces: agg.total,
        bestWpm: Math.round(agg.bestWpm * 100) / 100,
        bestAccuracy: Math.round(agg.bestAcc * 1000) / 10,
        languagesPracticed: agg.languages,
        favoriteLanguage: favEntry ? favEntry[0] : null,
        worldRank: myIndex >= 0 ? myIndex + 1 : null,
      },
      history: history.map((h) => ({
        id: h.id,
        language: h.language,
        wpm: Math.round(Number(h.wpm)),
        accuracy: Number(h.accuracy),
        errors: Number(h.errors),
        elapsed: Number(h.elapsed),
        created_at: h.created_at,
      })),
      achievements,
      unlockedAchievements: unlockedCount(achievements),
    });
  } catch (e) {
    console.error(`[/api/users] erro:`, e.message);
    res.status(500).json({ error: "Falha ao carregar o perfil." });
  }
});

async function dailyRanking(day, userId) {
  const list = await allDailySolves(day);
  list.sort((a, b) => {
    if (Number(a.attempts) !== Number(b.attempts)) return Number(a.attempts) - Number(b.attempts);
    return (a.duration ?? 1e9) - (b.duration ?? 1e9);
  });
  return list.slice(0, 20).map((r, i) => ({
    rank: i + 1,
    name: r.name || r.github_login || `#${r.user_id}`,
    avatarUrl: r.avatar_url,
    attempts: r.attempts,
    isMe: Number(r.user_id) === Number(userId),
  }));
}

async function dailyState(userId) {
  const today = dayKey();
  const entry = await getDailySolve(userId, today);
  const word = wordForTheDay();
  const solves = await listDailySolves(userId);
  const solved = entry ? Number(entry.solved) === 1 : false;
  return {
    date: today,
    wordLength: word.w.length,
    category: word.category,
    categoryLabel: word.categoryLabel,
    maxAttempts: MAX_ATTEMPTS,
    attempts: entry ? Number(entry.attempts) : 0,
    hintsRevealed: entry ? hintsFor(Number(entry.attempts)) : 0,
    solved,
    solvedWord: solved ? entry.word || word.w : null,
    explanation: solved ? word.explanation : null,
    hintsShowing: entry ? word.hints.slice(0, hintsFor(Number(entry.attempts))) : [],
    stats: computeStats(solves),
    ranking: await dailyRanking(today, userId),
  };
}

app.get("/api/daily/state", requireAuth, async (req, res) => {
  try {
    res.json(await dailyState(req.user.id));
  } catch (e) {
    console.error(`[/api/daily/state] erro:`, e.message);
    res.status(500).json({ error: "Falha ao carregar o desafio diário." });
  }
});

app.post("/api/daily/guess", requireAuth, async (req, res) => {
  const { guess } = req.body || {};
  const userId = req.user.id;
  const today = dayKey();
  try {
    const entry = await getDailySolve(userId, today);
    if (entry && Number(entry.solved) === 1) {
      return res.json({ ...(await dailyState(userId)), solved: true, alreadySolved: true });
    }
    const word = wordForTheDay();
    const g = String(guess || "").toLowerCase();
    if (g.length !== word.w.length) {
      return res.status(400).json({ error: `A palavra deve ter ${word.w.length} letras.` });
    }
    const attempts = (entry ? Number(entry.attempts) : 0) + 1;
    if (attempts > MAX_ATTEMPTS) {
      return res.status(400).json({ error: "Você esgotou suas tentativas de hoje." });
    }
    const feedback = letterFeedback(g, word.w);
    const solved = feedback.every((f) => f === "correct");
    await setDailyAttempt(userId, today, { attempts, hintsUsed: hintsFor(attempts) });
    let xpEarned = 0;
    let level = null;
    if (solved) {
      xpEarned = 40 + (MAX_ATTEMPTS - attempts) * 15;
      await recordDailySolve(userId, today, {
        word: word.w,
        solved: true,
        attempts,
        hintsUsed: hintsFor(attempts),
        duration: null,
      });
      const xpTotal = await grantXp(userId, xpEarned);
      level = levelInfo(xpTotal);
    } else if (attempts >= MAX_ATTEMPTS) {
      await recordDailySolve(userId, today, {
        word: word.w,
        solved: false,
        attempts,
        hintsUsed: hintsFor(attempts),
        duration: null,
      });
    }
    res.json({ ...(await dailyState(userId)), feedback, attempt: attempts, solved, xpEarned, level });
  } catch (e) {
    console.error(`[/api/daily/guess] erro:`, e.message);
    res.status(500).json({ error: "Falha ao processar a tentativa." });
  }
});

app.post("/api/daily/infinite", requireAuth, (req, res) => {
  const w = randomWord();
  const guess = String(req.body?.guess || "");
  if (guess) {
    if (guess.length !== w.w.length) {
      return res.status(400).json({ error: `A palavra deve ter ${w.w.length} letras.` });
    }
    const feedback = letterFeedback(guess, w.w);
    const solved = feedback.every((f) => f === "correct");
    return res.json({
      wordLength: w.w.length,
      categoryLabel: w.categoryLabel,
      maxAttempts: 6,
      solved,
      word: solved ? w.w : null,
      explanation: solved ? w.explanation : null,
      feedback,
    });
  }
  res.json({ wordLength: w.w.length, categoryLabel: w.categoryLabel, sessionId: Date.now() });
});

app.get("/api/interview/problems", (req, res) => {
  res.json({ languages: interviewLanguages(), problems: listInterviewProblems() });
});

app.get("/api/interview/snippet", (req, res) => {
  const { language, problem } = req.query;
  try {
    res.json(interviewSnippet(language, problem));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/api/rooms", requireAuth, async (req, res) => {
  const { language, type } = req.body || {};
  const me = publicUser(req.user);
  try {
    const room = await createRoom({
      userId: me.id,
      name: me.name || "Jogador",
      avatarUrl: me.avatarUrl,
      language,
      type,
    });
    res.status(201).json(roomState(room, me.id));
  } catch (e) {
    console.error(`[/api/rooms] erro:`, e.message);
    res.status(500).json({ error: "Falha ao criar a sala." });
  }
});

app.get("/api/rooms", (req, res) => {
  res.json({ rooms: listPublicRooms() });
});

app.get("/api/rooms/:code", requireAuth, (req, res) => {
  const room = getRoom(req.params.code);
  if (!room) return res.status(404).json({ error: "Sala não encontrada." });
  res.json(roomState(room, req.user.id));
});

app.post("/api/rooms/:code/join", requireAuth, (req, res) => {
  const me = publicUser(req.user);
  const result = joinRoom(req.params.code, {
    userId: me.id,
    name: me.name || "Jogador",
    avatarUrl: me.avatarUrl,
  });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(roomState(result.room, me.id));
});

app.post("/api/rooms/:code/start", requireAuth, (req, res) => {
  const result = startRoom(req.params.code, req.user.id);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(roomState(result.room, req.user.id));
});

app.post("/api/rooms/:code/progress", requireAuth, (req, res) => {
  const result = updateProgress(req.params.code, req.user.id, req.body || {});
  if (!result.ok) return res.status(400).json({ error: "Não foi possível atualizar o progresso." });
  res.json({ ok: true });
});

app.post("/api/rooms/:code/finish", requireAuth, (req, res) => {
  const result = completePlay(req.params.code, req.user.id, req.body || {});
  if (!result.ok) return res.status(400).json({ error: "Não foi possível finalizar a partida." });
  res.json(roomState(result.room, req.user.id));
});

app.post("/api/rooms/:code/again", requireAuth, (req, res) => {
  const { language } = req.body || {};
  const result = playAgain(req.params.code, language, req.user.id);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(roomState(result.room, req.user.id));
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
