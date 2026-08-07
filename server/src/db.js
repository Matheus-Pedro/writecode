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
      CREATE TABLE IF NOT EXISTS daily_solves (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        day TEXT NOT NULL,
        word TEXT,
        solved INTEGER NOT NULL DEFAULT 0,
        attempts INTEGER NOT NULL DEFAULT 0,
        hints_used INTEGER NOT NULL DEFAULT 0,
        duration DOUBLE PRECISION,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_user_day ON daily_solves(user_id, day);
    `);
    for (const [table, col] of [
      ["users", "xp"],
      ["results", "xp"],
    ]) {
      try {
        await pool.query(`ALTER TABLE ${table} ADD COLUMN ${col} INTEGER NOT NULL DEFAULT 0`);
      } catch {}
    }
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN name TEXT`);
    } catch {}
    await pool.query(
      `UPDATE users
          SET name = COALESCE(NULLIF(name,''), github_login, SPLIT_PART(email, '@', 1))
        WHERE name IS NULL OR name = ''`
    );
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
    CREATE TABLE IF NOT EXISTS daily_solves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      day TEXT NOT NULL,
      word TEXT,
      solved INTEGER NOT NULL DEFAULT 0,
      attempts INTEGER NOT NULL DEFAULT 0,
      hints_used INTEGER NOT NULL DEFAULT 0,
      duration REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_user_day ON daily_solves(user_id, day);
  `);
  for (const stmt of [
    `ALTER TABLE users ADD COLUMN xp INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE results ADD COLUMN xp INTEGER NOT NULL DEFAULT 0`,
  ]) {
    try {
      sqlite.exec(stmt);
    } catch {}
  }
  try {
    sqlite.exec(`ALTER TABLE users ADD COLUMN name TEXT`);
  } catch {}
  sqlite.exec(
    `UPDATE users
        SET name = COALESCE(github_login, SUBSTR(email, 1, INSTR(email, '@') - 1))
      WHERE (name IS NULL OR name = '') AND email LIKE '%@%'`
  );
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

export async function findUserByLogin(login) {
  if (isPg) {
    const r = await pool.query(
      "SELECT * FROM users WHERE github_login = $1 OR name = $1 ORDER BY id LIMIT 1",
      [login]
    );
    return r.rows[0] || null;
  }
  return sqlite.prepare("SELECT * FROM users WHERE github_login = ? OR name = ? ORDER BY id LIMIT 1").get(login, login) || null;
}

export async function findUserById(id) {
  if (isPg) {
    const r = await pool.query("SELECT * FROM users WHERE id = $1", [Number(id)]);
    return r.rows[0] || null;
  }
  return sqlite.prepare("SELECT * FROM users WHERE id = ?").get(Number(id)) || null;
}

export async function createUser({ email, passwordHash, githubId, githubLogin, avatarUrl, name }) {
  const fallbackName =
    name || githubLogin || (email ? String(email).split("@")[0] : null) || null;
  if (isPg) {
    const r = await pool.query(
      `INSERT INTO users (email, password_hash, github_id, github_login, avatar_url, name)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [email ?? null, passwordHash ?? null, githubId ?? null, githubLogin ?? null, avatarUrl ?? null, fallbackName]
    );
    return r.rows[0];
  }
  const info = sqlite
    .prepare(
      `INSERT INTO users (email, password_hash, github_id, github_login, avatar_url, name)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(email ?? null, passwordHash ?? null, githubId ?? null, githubLogin ?? null, avatarUrl ?? null, fallbackName);
  return {
    id: info.lastInsertRowid,
    email,
    password_hash: passwordHash,
    github_id: githubId,
    github_login: githubLogin,
    avatar_url: avatarUrl,
    name: fallbackName,
  };
}

export async function updateUserName(id, name) {
  const clean = String(name || "").trim().slice(0, 40);
  if (!clean) return null;
  if (isPg) {
    const r = await pool.query("UPDATE users SET name = $2 WHERE id = $1 RETURNING *", [
      Number(id),
      clean,
    ]);
    return r.rows[0] || null;
  }
  sqlite.prepare("UPDATE users SET name = ? WHERE id = ?").run(clean, Number(id));
  return sqlite.prepare("SELECT * FROM users WHERE id = ?").get(Number(id)) || null;
}

export async function updateGithubUser(id, { githubLogin, avatarUrl, email }) {
  if (isPg) {
    const r = await pool.query(
      `UPDATE users
       SET github_login = COALESCE($2, github_login),
           avatar_url = COALESCE($3, avatar_url),
           email = COALESCE($4, email),
           name = CASE WHEN name IS NULL OR name = '' THEN $2 ELSE name END
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
           email = COALESCE(?, email),
           name = CASE WHEN name IS NULL OR name = '' THEN ? ELSE name END
       WHERE id = ?`
    )
    .run(githubLogin, avatarUrl, email, githubLogin, Number(id));
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

export async function getDailySolve(userId, day) {
  if (isPg) {
    const r = await pool.query("SELECT * FROM daily_solves WHERE user_id = $1 AND day = $2", [
      Number(userId),
      day,
    ]);
    return r.rows[0] || null;
  }
  return sqlite.prepare("SELECT * FROM daily_solves WHERE user_id = ? AND day = ?").get(Number(userId), day) || null;
}

export async function setDailyAttempt(userId, day, { attempts, hintsUsed }) {
  if (isPg) {
    const r = await pool.query(
      `INSERT INTO daily_solves (user_id, day, attempts, hints_used)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, day)
       DO UPDATE SET attempts = $3, hints_used = $4
       RETURNING *`,
      [Number(userId), day, attempts, hintsUsed]
    );
    return r.rows[0];
  }
  sqlite
    .prepare(
      `INSERT INTO daily_solves (user_id, day, attempts, hints_used)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, day) DO UPDATE SET attempts = excluded.attempts, hints_used = excluded.hints_used`
    )
    .run(Number(userId), day, attempts, hintsUsed);
  return sqlite.prepare("SELECT * FROM daily_solves WHERE user_id = ? AND day = ?").get(Number(userId), day);
}

export async function recordDailySolve(userId, day, { word, solved, attempts, hintsUsed, duration }) {
  if (isPg) {
    const r = await pool.query(
      `INSERT INTO daily_solves (user_id, day, word, solved, attempts, hints_used, duration)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, day)
       DO UPDATE SET word = $3, solved = $4, attempts = $5, hints_used = $6, duration = COALESCE($7, daily_solves.duration)
       RETURNING *`,
      [Number(userId), day, word, solved ? 1 : 0, attempts, hintsUsed, duration ?? null]
    );
    return r.rows[0];
  }
  sqlite
    .prepare(
      `INSERT INTO daily_solves (user_id, day, word, solved, attempts, hints_used, duration)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, day) DO UPDATE SET
         word = excluded.word,
         solved = excluded.solved,
         attempts = excluded.attempts,
         hints_used = excluded.hints_used,
         duration = COALESCE(excluded.duration, daily_solves.duration)`
    )
    .run(Number(userId), day, word, solved ? 1 : 0, attempts, hintsUsed, duration ?? null);
  return sqlite.prepare("SELECT * FROM daily_solves WHERE user_id = ? AND day = ?").get(Number(userId), day);
}

export async function allDailySolves(day) {
  if (isPg) {
    const r = await pool.query(
      `SELECT u.id AS user_id, u.name, u.github_login, u.avatar_url, s.solved, s.attempts, s.hints_used, s.duration
         FROM daily_solves s JOIN users u ON u.id = s.user_id
        WHERE s.day = $1 AND s.solved = 1`, [day]
    );
    return r.rows;
  }
  return sqlite
    .prepare(
      `SELECT u.id AS user_id, u.name, u.github_login, u.avatar_url, s.solved, s.attempts, s.hints_used, s.duration
         FROM daily_solves s JOIN users u ON u.id = s.user_id
        WHERE s.day = ? AND s.solved = 1`
    )
    .all(day);
}

export async function listDailySolves(userId) {
  if (isPg) {
    const r = await pool.query(
      `SELECT day, solved, attempts, duration FROM daily_solves WHERE user_id = $1 ORDER BY day DESC LIMIT 400`,
      [Number(userId)]
    );
    return r.rows;
  }
  return sqlite
    .prepare("SELECT day, solved, attempts, duration FROM daily_solves WHERE user_id = ? ORDER BY day DESC LIMIT 400")
    .all(Number(userId));
}

export async function aggregateResults(userId) {
  if (isPg) {
    const r = await pool.query(
`SELECT COUNT(*) AS total,
              MAX(COALESCE(wpm,0)) AS best_wpm,
              MAX(COALESCE(accuracy,0)) AS best_acc,
              SUM(CASE WHEN COALESCE(accuracy,0) >= 0.999 THEN 1 ELSE 0 END) AS acc100,
              SUM(CASE WHEN COALESCE(accuracy,0) >= 0.99 THEN 1 ELSE 0 END) AS acc99,
              SUM(CASE WHEN COALESCE(accuracy,0) >= 0.95 THEN 1 ELSE 0 END) AS acc95,
              COUNT(DISTINCT language) AS languages
         FROM results WHERE user_id = $1`,
      [Number(userId)]
    );
    const ak = r.rows[0];
    const lang = await pool.query(
      `SELECT language, COUNT(*) AS n FROM results WHERE user_id = $1 GROUP BY language`,
      [Number(userId)]
    );
    const langs = Object.fromEntries(lang.rows.map((x) => [x.language, Number(x.n)]));
    const days = await pool.query(
      `SELECT date(created_at) AS d FROM results WHERE user_id = $1 GROUP BY date(created_at)`,
      [Number(userId)]
    );
    return { total: Number(ak.total) || 0, bestWpm: Number(ak.best_wpm) || 0, bestAcc: Number(ak.best_acc) || 0, acc100: Number(ak.acc100) || 0, acc99: Number(ak.acc99) || 0, acc95: Number(ak.acc95) || 0, languages: Number(ak.languages) || 0, langs, activityDays: days.rows.map((x) => x.d) };
  }
  const row = sqlite
    .prepare(
      `SELECT COUNT(*) AS total,
              MAX(wpm) AS best_wpm,
              MAX(wpm) AS best_acc,
              SUM(CASE WHEN errors >= 0 AND wpm <= 100000 THEN 1 ELSE 0 END) AS cnt,
              COUNT(*) AS n99
         FROM results WHERE user_id = ?`
    )
    .get(Number(userId));
  const agg = sqlite
    .prepare(
      `SELECT
         COUNT(*) AS total,
         IFNULL(MAX(wpm),0) AS best_wpm,
         IFNULL(MAX(accuracy),0) AS best_acc,
         SUM(CASE WHEN accuracy >= 0.999 THEN 1 ELSE 0 END) AS acc100,
         SUM(CASE WHEN accuracy >= 0.99 THEN 1 ELSE 0 END) AS acc99,
         SUM(CASE WHEN accuracy >= 0.95 THEN 1 ELSE 0 END) AS acc95,
         COUNT(DISTINCT language) AS languages
       FROM results WHERE user_id = ?`
    )
    .get(Number(userId));
  const lang = sqlite.prepare("SELECT language, COUNT(*) AS n FROM results WHERE user_id = ? GROUP BY language").all(Number(userId));
  const langs = Object.fromEntries(lang.map((x) => [x.language, Number(x.n)]));
const days = sqlite.prepare("SELECT date(created_at) AS d FROM results WHERE user_id = ? GROUP BY date(created_at)").all(Number(userId));
  return { total: Number(agg.total) || 0, bestWpm: Number(agg.best_wpm) || 0, bestAcc: Number(agg.best_acc) || 0, acc100: Number(agg.acc100) || 0, acc99: Number(agg.acc99) || 0, acc95: Number(agg.acc95) || 0, languages: Number(agg.languages) || 0, langs, activityDays: days.map((x) => x.d) };
}

export async function advancedStats(userId) {
  if (isPg) {
    const r = await pool.query(
      `SELECT language,
              COUNT(*) AS races,
              AVG(wpm) AS avg_wpm,
              MAX(wpm) AS max_wpm,
              AVG(accuracy) AS avg_acc,
              SUM(errors) AS total_errors,
              AVG(elapsed) AS avg_time
         FROM results WHERE user_id = $1 GROUP BY language`,
      [Number(userId)]
    );
    return r.rows.map((x) => ({ language: x.language, races: Number(x.races) || 0, avgWpm: Number(x.avg_wpm) || 0, maxWpm: Number(x.max_wpm) || 0, avgAcc: Number(x.avg_acc) || 0, totalErrors: Number(x.total_errors) || 0, avgTime: Number(x.avg_time) || 0 }));
  }
  return sqlite
    .prepare(
      `SELECT language,
              COUNT(*) AS races,
              AVG(wpm) AS avg_wpm,
              MAX(wpm) AS max_wpm,
              AVG(accuracy) AS avg_acc,
              SUM(errors) AS total_errors,
              AVG(elapsed) AS avg_time
         FROM results WHERE user_id = ? GROUP BY language`
    )
    .all(Number(userId))
    .map((x) => ({ language: x.language, races: Number(x.races) || 0, avgWpm: Number(x.avg_wpm) || 0, maxWpm: Number(x.max_wpm) || 0, avgAcc: Number(x.avg_acc) || 0, totalErrors: Number(x.total_errors) || 0, avgTime: Number(x.avg_time) || 0 }));
}

export async function leaderboardGlobal(days, limit = 50) {
  if (isPg) {
    const fromPg = days ? ` WHERE r.created_at >= now() - interval '${days} days'` : "";
    const r = await pool.query(
      `SELECT u.id, u.name, u.github_login, u.avatar_url, u.xp,
              COUNT(r.id) AS races,
              MAX(r.wpm) AS best_wpm,
              AVG(r.accuracy) AS avg_acc,
              MAX(r.accuracy) AS best_acc,
              AVG(r.cpm) AS avg_cpm
         FROM users u JOIN results r ON r.user_id = u.id${fromPg}
        WHERE 1=1${fromPg ? "" : ""}
        GROUP BY u.id
        ORDER BY best_wpm DESC NULLS LAST
        LIMIT $1`,
      [Number(limit)]
    );
    return r.rows;
  }
  const where = days ? ` AND date(r.created_at) >= date('now', '-${days} days')` : "";
  return sqlite
    .prepare(
      `SELECT u.id, u.name, u.github_login, u.avatar_url, u.xp,
              COUNT(r.id) AS races,
              MAX(r.wpm) AS best_wpm,
              AVG(r.accuracy) AS avg_acc,
              MAX(r.accuracy) AS best_acc,
              AVG(r.cpm) AS avg_cpm
         FROM users u JOIN results r ON r.user_id = u.id
        WHERE 1=1${where}
        GROUP BY u.id
        ORDER BY best_wpm DESC
        LIMIT ?`
    )
    .all(Number(limit));
}