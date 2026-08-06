import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  findUserByEmail,
  findUserByGithubId,
  findUserById,
  createUser,
  updateGithubUser,
} from "./db.js";
import { levelInfo } from "./xp.js";

const JWT_SECRET = process.env.JWT_SECRET || "writecode-dev-secret-change-me";
const COOKIE = "wc_token";
const APP_URL = (process.env.APP_URL || "http://localhost:3001").replace(/\/$/, "");
const GH_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const GH_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";
const GH_AUTH = "https://github.com/login/oauth";
const GH_API = "https://api.github.com";

function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, JWT_SECRET, { expiresIn: "7d" });
}

async function userFromReq(req) {
  const cookie = req.cookies?.[COOKIE];
  if (!cookie) return null;
  try {
    const { sub } = jwt.verify(cookie, JWT_SECRET);
    return await findUserById(Number(sub));
  } catch {
    return null;
  }
}

export async function requireAuth(req, res, next) {
  const user = await userFromReq(req);
  if (!user) return res.status(401).json({ error: "Não autenticado. Faça login." });
  req.user = user;
  next();
}

/** Define req.user se houver cookie válido; caso contrário segue sem autenticar. */
export async function optionalAuth(req, _res, next) {
  req.user = await userFromReq(req);
  next();
}

export async function currentUser(req) {
  const user = await userFromReq(req);
  return user ? publicUser(user) : null;
}

export function publicUser(u) {
  const xp = Number(u.xp || 0);
  return {
    id: u.id,
    email: u.email || null,
    name: u.github_login || u.email?.split("@")[0] || null,
    avatarUrl: u.avatar_url || null,
    xp,
    level: levelInfo(xp).level,
  };
}

function setCookie(res, token) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

const router = Router();

router.post("/register", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "E-mail inválido." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Senha deve ter ao menos 6 caracteres." });
  }
  const exists = await findUserByEmail(email);
  if (exists) {
    return res.status(409).json({ error: "E-mail já cadastrado." });
  }
  const hash = bcrypt.hashSync(password, 10);
  const user = await createUser({ email, passwordHash: hash });
  setCookie(res, signToken(user.id));
  res.status(201).json({ user: publicUser(user) });
});

router.post("/login", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const user = await findUserByEmail(email);
  if (!user || !user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "E-mail ou senha incorretos." });
  }
  setCookie(res, signToken(user.id));
  res.json({ user: publicUser(user) });
});

router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE, { path: "/" });
  res.json({ ok: true });
});

router.get("/me", async (req, res) => {
  const user = await userFromReq(req);
  res.json({ user: user ? publicUser(user) : null });
});

router.get("/github", (req, res) => {
  if (!GH_CLIENT_ID) {
    return res.status(500).json({ error: "GitHub OAuth não configurado." });
  }
  const redirectUri = `${APP_URL}/api/auth/github/callback`;
  const url = `${GH_AUTH}/authorize?client_id=${encodeURIComponent(GH_CLIENT_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent("user:email")}`;
  res.redirect(url);
});

router.get("/github/callback", async (req, res) => {
  const code = req.query.code;
  if (!GH_CLIENT_ID || !GH_CLIENT_SECRET || !code) {
    return res.redirect(`${APP_URL}/?auth_error=github`);
  }
  try {
    const tokRes = await fetch(`${GH_AUTH}/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: GH_CLIENT_ID,
        client_secret: GH_CLIENT_SECRET,
        code,
      }),
    });
    const tok = await tokRes.json();
    if (!tok.access_token) {
      return res.redirect(`${APP_URL}/?auth_error=github`);
    }
    const [uRes, eRes] = await Promise.all([
      fetch(`${GH_API}/user`, {
        headers: { Authorization: `Bearer ${tok.access_token}`, "User-Agent": "writecode", Accept: "application/vnd.github+json" },
      }),
      fetch(`${GH_API}/user/emails`, {
        headers: { Authorization: `Bearer ${tok.access_token}`, "User-Agent": "writecode", Accept: "application/vnd.github+json" },
      }),
    ]);
    const gh = await uRes.json();
    let email = gh.email || null;
    if (!email && eRes.ok) {
      const emails = await eRes.json();
      email = (emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified))?.email || null;
    }
    const existing = await findUserByGithubId(gh.id);
    let user;
    if (existing) {
      user = await updateGithubUser(existing.id, {
        githubLogin: gh.login || null,
        avatarUrl: gh.avatar_url || null,
        email,
      });
    } else {
      user = await createUser({
        email,
        githubId: String(gh.id),
        githubLogin: gh.login || null,
        avatarUrl: gh.avatar_url || null,
      });
    }
    setCookie(res, signToken(user.id));
    res.redirect(`${APP_URL}/`);
  } catch (e) {
    res.redirect(`${APP_URL}/?auth_error=github`);
  }
});

export default router;