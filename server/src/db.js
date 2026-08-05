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
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
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
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_github ON users(github_id) WHERE github_id IS NOT NULL;
  `);
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