import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL || "";
export const isPg = Boolean(DATABASE_URL);

let sqlite = null;
export const pool = isPg ? new pg.Pool({ connectionString: DATABASE_URL }) : null;

export async function initDb() {
  if (isPg) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        email TEXT UNIQUE,
        password_hash TEXT,
        github_id TEXT UNIQUE,
        github_login TEXT,
        avatar_url TEXT,
        xp INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS results (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        language TEXT,
        source TEXT,
        cpm DOUBLE PRECISION NOT NULL,
        wpm DOUBLE PRECISION NOT NULL,
        accuracy DOUBLE PRECISION NOT NULL,
        errors INTEGER NOT NULL,
        elapsed DOUBLE PRECISION NOT NULL,
        xp INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_results_user ON results(user_id);
    `);
    for (const [table, col] of [
      ["users", "xp"],
      ["results", "xp"],
    ]) {
      try {
        await pool.query(`ALTER TABLE ${table} ADD COLUMN ${col} INTEGER NOT NULL DEFAULT 0`);
      } catch {}
    }
    return;
  }
  const { default: Database } = await import("better-sqlite3");
  const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "writecode.db");
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT,
      password_hash TEXT,
      github_id TEXT,
      github_login TEXT,
      avatar_url TEXT,
      xp INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_github ON users(github_id) WHERE github_id IS NOT NULL;
    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      language TEXT,
      source TEXT,
      cpm REAL NOT NULL,
      wpm REAL NOT NULL,
      accuracy REAL NOT NULL,
      errors INTEGER NOT NULL,
      elapsed REAL NOT NULL,
      xp INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_results_user ON results(user_id);
  `);
  for (const stmt of [
    `ALTER TABLE users ADD COLUMN xp INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE results ADD COLUMN xp INTEGER NOT NULL DEFAULT 0`,
  ]) {
    try {
      sqlite.exec(stmt);
    } catch {}
  }
}

export async function findUserByEmail(email) {
  if (isPg) {
    const r = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    return r.rows[0] || null;
  }
  return sqlite.prepare("SELECT * FROM users WHERE email = ?").get(email) || null;
}

export async function findUserByGithubId(githubId) {
  if (isPg) {
    const r = await pool.query("SELECT * FROM users WHERE github_id = $1", [String(githubId)]);
    return r.rows[0] || null;
  }
  return sqlite.prepare("SELECT * FROM users WHERE github_id = ?").get(String(githubId)) || null;
}

export async function findUserById(id) {
  if (isPg) {
    const r = await pool.query("SELECT * FROM users WHERE id = $1", [Number(id)]);
    return r.rows[0] || null;
  }
  return sqlite.prepare("SELECT * FROM users WHERE id = ?").get(Number(id)) || null;
}

export async function createUser({ email, passwordHash, githubId, githubLogin, avatarUrl }) {
  if (isPg) {
    const r = await pool.query(
      `INSERT INTO users (email, password_hash, github_id, github_login, avatar_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [email ?? null, passwordHash ?? null, githubId ?? null, githubLogin ?? null, avatarUrl ?? null]
    );
    return r.rows[0];
  }
  const info = sqlite
    .prepare(
      `INSERT INTO users (email, password_hash, github_id, github_login, avatar_url)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(email ?? null, passwordHash ?? null, githubId ?? null, githubLogin ?? null, avatarUrl ?? null);
  return {
    id: info.lastInsertRowid,
    email,
    password_hash: passwordHash,
    github_id: githubId,
    github_login: githubLogin,
    avatar_url: avatarUrl,
  };
}

export async function updateGithubUser(id, { githubLogin, avatarUrl, email }) {
  if (isPg) {
    const r = await pool.query(
      `UPDATE users
       SET github_login = COALESCE($2, github_login),
           avatar_url = COALESCE($3, avatar_url),
           email = COALESCE($4, email)
       WHERE id = $1
       RETURNING *`,
      [Number(id), githubLogin, avatarUrl, email]
    );
    return r.rows[0];
  }
  sqlite
    .prepare(
      `UPDATE users
       SET github_login = COALESCE(?, github_login),
           avatar_url = COALESCE(?, avatar_url),
           email = COALESCE(?, email)
       WHERE id = ?`
    )
    .run(githubLogin, avatarUrl, email, Number(id));
  return sqlite.prepare("SELECT * FROM users WHERE id = ?").get(Number(id));
}

export async function createResult({ userId, language, source, cpm, wpm, accuracy, errors, elapsed, xp }) {
  if (isPg) {
    const r = await pool.query(
      `INSERT INTO results (user_id, language, source, cpm, wpm, accuracy, errors, elapsed, xp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [userId, language, source, cpm, wpm, accuracy, errors, elapsed, xp]
    );
    return r.rows[0];
  }
  const info = sqlite
    .prepare(
      `INSERT INTO results (user_id, language, source, cpm, wpm, accuracy, errors, elapsed, xp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(userId, language, source, cpm, wpm, accuracy, errors, elapsed, xp);
  return { id: info.lastInsertRowid };
}

export async function listResults(userId, limit = 50) {
  if (isPg) {
    const r = await pool.query(
      `SELECT * FROM results WHERE user_id = $1 ORDER BY id DESC LIMIT $2`,
      [userId, limit]
    );
    return r.rows;
  }
  return sqlite
    .prepare("SELECT * FROM results WHERE user_id = ? ORDER BY id DESC LIMIT ?")
    .all(userId, limit);
}

export async function grantXp(userId, amount) {
  if (isPg) {
    const r = await pool.query("UPDATE users SET xp = xp + $2 WHERE id = $1 RETURNING xp", [
      Number(userId),
      Math.round(amount),
    ]);
    return Number(r.rows[0]?.xp || 0);
  }
  sqlite.prepare("UPDATE users SET xp = xp + ? WHERE id = ?").run(Math.round(amount), Number(userId));
  return Number(sqlite.prepare("SELECT xp FROM users WHERE id = ?").get(Number(userId))?.xp || 0);
}

export async function hasResultToday(userId) {
  if (isPg) {
    const r = await pool.query(
      `SELECT to_char(created_at, 'YYYY-MM-DD') AS d
         FROM results WHERE user_id = $1
         ORDER BY created_at DESC LIMIT 1`,
      [Number(userId)]
    );
    return r.rows[0]?.d === new Date().toISOString().slice(0, 10);
  }
  const row = sqlite
    .prepare("SELECT date(created_at) AS d FROM results WHERE user_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(Number(userId));
  return row?.d === new Date().toISOString().slice(0, 10);
}