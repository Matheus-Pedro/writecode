import { randomBytes } from "node:crypto";

// Sessões de corrida de uso único. Cada trecho entregue ao cliente recebe um
// id opaco; o POST /api/results precisa devolvê-lo para validarmos que a corrida
// veio de um trecho que o servidor realmente emitiu (e há quanto tempo).
const sessions = new Map();
const TTL_MS = 30 * 60 * 1000;

function cleanup() {
  const now = Date.now();
  for (const [k, v] of sessions) {
    if (now - v.createdAt > TTL_MS) sessions.delete(k);
  }
}

export function issueSession(length) {
  const id = randomBytes(16).toString("hex");
  sessions.set(id, { createdAt: Date.now(), length: Number(length) || 0 });
  cleanup();
  return id;
}

export function consumeSession(id, { length } = {}) {
  if (!id) return { ok: false, error: "Sessão de corrida ausente." };
  const s = sessions.get(id);
  // Sessão sumida (restart / outra instância): não falha o usuário legítimo,
  // mas a checagem de tempo mínimo passa a usar o tamanho informado pelo cliente.
  if (!s) return { ok: true, fallback: true, createdAt: null, length: Number(length) || 0 };
  sessions.delete(id);
  return { ok: true, fallback: false, createdAt: s.createdAt, length: s.length };
}