import { githubRandom } from "./github.js";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const PLAYER_COLORS = ["#a78bfa", "#34d399", "#f472b6", "#60a5fa", "#fbbf24", "#f87171", "#2dd4bf", "#a3e635"];

const rooms = new Map();

function randomCode() {
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function scoreFor({ accuracy, cpm, errors, elapsed }) {
  const accuracyScore = Math.round((Number(accuracy) || 0) * 300);
  const speedScore = Math.min(400, Math.round((Number(cpm) || 0) * 300));
  const errorPenalty = (Math.round(Number(errors)) || 0) * 10;
  const timePenalty = Math.round((Number(elapsed) || 0) / 3);
  return Math.max(0, 1000 + accuracyScore + speedScore - errorPenalty - timePenalty);
}

function computeRanking(room) {
  const list = [...room.players.values()];
  list.sort((a, b) => {
    const af = a.finished ? a.finishedAt : Infinity;
    const bf = b.finished ? b.finishedAt : Infinity;
    if (af !== bf) return af - bf;
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    if (b.errors !== a.errors) return b.errors - a.errors;
    return b.score - a.score;
  });
  list.forEach((p, i) => {
    p.rank = p.finished ? i + 1 : null;
  });
  return list;
}

export async function createRoom({ userId, name, avatarUrl, language, type }) {
  const code = randomCode();
  let snippet;
  try {
    snippet = await githubRandom(language);
  } catch {
    snippet = {
      code: "// Snippet indisponível. Tente novamente.",
      source: "source",
      path: null,
    };
  }
  const room = {
    code,
    language,
    type: type === "private" ? "private" : "public",
    state: "lobby",
    startAt: null,
    snippet,
    hostId: userId,
    createdAt: Date.now(),
    players: new Map(),
  };
  addPlayer(room, { userId, name, avatarUrl, isHost: true });
  rooms.set(code, room);
  return room;
}

function addPlayer(room, { userId, name, avatarUrl, isHost = false }) {
  const player = {
    userId,
    name,
    avatarUrl,
    color: PLAYER_COLORS[room.players.size % PLAYER_COLORS.length],
    ready: false,
    isHost,
    progress: 0,
    cpm: 0,
    accuracy: 0,
    errors: 0,
    finished: false,
    finishedAt: null,
    score: null,
    rank: null,
  };
  room.players.set(String(userId), player);
  return player;
}

export function getRoom(code) {
  const room = rooms.get(String(code).toUpperCase());
  if (!room) return null;
  computeRanking(room);
  return room;
}

export function listPublicRooms() {
  const out = [];
  for (const room of rooms.values()) {
    if (room.type !== "public" || room.state !== "lobby") continue;
    out.push({
      code: room.code,
      language: room.language,
      players: room.players.size,
      host: [...room.players.values()][0]?.name || "?",
    });
  }
  return out;
}

export function joinRoom(code, { userId, name, avatarUrl }) {
  const room = getRoom(code);
  if (!room) return { error: "Sala não encontrada." };
  if (room.state !== "lobby") return { error: "A partida já começou." };
  if (room.players.has(String(userId))) return { ok: true, room };
  if (room.players.size >= 20) return { error: "Sala cheia." };
  addPlayer(room, { userId, name, avatarUrl });
  return { ok: true, room };
}

export function updateProgress(code, userId, data) {
  const room = getRoom(code);
  const player = room?.players.get(String(userId));
  if (!room || !player) return { ok: false };
  player.progress = Math.max(0, Math.min(100, Number(data.progress) || player.progress));
  player.cpm = Number(data.cpm) || 0;
  player.accuracy = Number(data.accuracy) || 0;
  player.errors = Math.round(Number(data.errors)) || 0;
  return { ok: true };
}

export function completePlay(code, userId, data) {
  const room = getRoom(code);
  const player = room?.players.get(String(userId));
  if (!room || !player || player.finished) return { ok: false, room };
  player.progress = 100;
  player.cpm = Number(data.cpm) || 0;
  player.accuracy = Number(data.accuracy) || 0;
  player.errors = Math.round(Number(data.errors)) || 0;
  player.elapsed = Number(data.elapsed) || 0;
  player.score = scoreFor({
    accuracy: player.accuracy,
    cpm: player.cpm,
    errors: player.errors,
    elapsed: player.elapsed,
  });
  player.finished = true;
  player.finishedAt = Date.now();
  computeRanking(room);
  const allFinished = [...room.players.values()].every((p) => p.finished);
  if (allFinished) room.state = "finished";
  return { ok: true, room };
}

export function startRoom(code, hostId) {
  const room = rooms.get(String(code).toUpperCase());
  if (!room) return { error: "Sala não encontrada." };
  if (String(room.hostId) !== String(hostId)) return { error: "Apenas o host pode iniciar." };
  if (room.state !== "lobby") return { error: "A partida já começou." };
  room.state = "countdown";
  room.startAt = Date.now() + 3500;
  return { ok: true, room };
}

export function playAgain(code, language, hostId) {
  const room = rooms.get(String(code).toUpperCase());
  if (!room) return { ok: false, error: "Sala não encontrada." };
  if (String(room.hostId) !== String(hostId)) return { ok: false, error: "Apenas o host pode reiniciar." };
  let snippet;
  try {
    snippet = githubRandom(language);
  } catch {
    snippet = room.snippet;
  }
  room.snippet = snippet;
  room.state = "lobby";
  room.startAt = null;
  for (const p of room.players.values()) {
    p.ready = false;
    p.progress = 0;
    p.cpm = 0;
    p.accuracy = 0;
    p.errors = 0;
    p.finished = false;
    p.finishedAt = null;
    p.score = null;
    p.rank = null;
  }
  return { ok: true, room: getRoom(code) };
}

export function roomState(room, selfUserId) {
  computeRanking(room);
  const self = room.players.get(String(selfUserId));
  return {
    code: room.code,
    type: room.type,
    language: room.language,
    state: room.state,
    startAt: room.startAt,
    isPlayer: Boolean(self),
    snippet: room.snippet,
    hostId: room.hostId,
    players: [...room.players.values()].map((p) => publicPlayerPublic(p)),
    self: self ? publicPlayerPublic(self) : null,
  };
}

function publicPlayerPublic(p) {
  return {
    userId: p.userId,
    name: p.name,
    avatarUrl: p.avatarUrl,
    color: p.color,
    ready: p.ready,
    isHost: p.isHost,
    progress: p.progress,
    cpm: p.cpm,
    accuracy: p.accuracy,
    errors: p.errors,
    elapsed: p.elapsed,
    finished: p.finished,
    score: p.score,
    rank: p.rank,
  };
}

export function cleanupRooms() {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.createdAt > 2 * 60 * 60 * 1000) rooms.delete(code);
  }
}