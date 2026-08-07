export interface SnippetData {
  code: string;
  source: string;
  path: string | null;
}

export interface ApiConfig {
  aiEnabled: boolean;
  languages: string[];
}

export interface User {
  id: number;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  xp: number;
  level: number;
}

export interface LevelInfo {
  level: number;
  xp: number;
  into: number;
  needed: number;
  progress: number;
}

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Erro ${res.status}`);
  }
  return data as T;
}

export function getConfig() {
  return request<ApiConfig>("/api/config");
}

export function fetchGithubRandom(language: string) {
  return request<SnippetData>(
    `/api/github/random?language=${encodeURIComponent(language)}`
  );
}

export function fetchGithubRepo(language: string, repo: string) {
  return request<SnippetData>(
    `/api/github/from-repo?language=${encodeURIComponent(language)}&repo=${encodeURIComponent(repo)}`
  );
}

export function fetchAiSnippet(language: string, difficulty: string) {
  return request<SnippetData>("/api/ai", {
    method: "POST",
    body: JSON.stringify({ language, difficulty }),
  });
}

export function getMe() {
  return request<{ user: User | null }>("/api/auth/me");
}

export function register(email: string, password: string) {
  return request<{ user: User }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function login(email: string, password: string) {
  return request<{ user: User }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return request<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
}

export function updateName(name: string) {
  return request<{ user: User }>("/api/auth/me", {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export function githubLoginUrl() {
  return "/api/auth/github";
}

export interface ResultRow {
  id: number;
  language: string | null;
  source: string | null;
  cpm: number;
  wpm: number;
  accuracy: number;
  errors: number;
  elapsed: number;
  xp: number;
  created_at: string;
}

export interface SaveResultResponse {
  result: ResultRow;
  xpEarned: number;
  bonus: number;
  level: LevelInfo;
}

export function saveResult(payload: {
  language: string | null;
  source: string | null;
  cpm: number;
  wpm: number;
  accuracy: number;
  errors: number;
  elapsed: number;
}) {
  return request<SaveResultResponse>("/api/results", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getResults() {
  return request<{ results: ResultRow[]; level: LevelInfo }>("/api/results");
}

export interface RoomPlayer {
  userId: number;
  name: string;
  avatarUrl: string | null;
  color: string;
  ready: boolean;
  isHost: boolean;
  progress: number;
  cpm: number;
  accuracy: number;
  errors: number;
  elapsed: number;
  finished: boolean;
  score: number | null;
  rank: number | null;
}

export type RoomState = "lobby" | "countdown" | "racing" | "finished";

export interface Room {
  code: string;
  type: "public" | "private";
  language: string;
  state: RoomState;
  startAt: number | null;
  isPlayer: boolean;
  snippet: SnippetData;
  hostId: number;
  players: RoomPlayer[];
  self: RoomPlayer | null;
}

export function createRoom(language: string, type: "public" | "private") {
  return request<Room>("/api/rooms", {
    method: "POST",
    body: JSON.stringify({ language, type }),
  });
}

export function listRoomsPublic() {
  return request<{ rooms: { code: string; language: string; players: number; host: string }[] }>(
    "/api/rooms"
  );
}

export function getRoom(code: string) {
  return request<Room>(`/api/rooms/${encodeURIComponent(code)}`);
}

export function joinRoom(code: string) {
  return request<Room>(`/api/rooms/${encodeURIComponent(code)}/join`, { method: "POST" });
}

export function startRoom(code: string) {
  return request<Room>(`/api/rooms/${encodeURIComponent(code)}/start`, { method: "POST" });
}

export function postRoomProgress(
  code: string,
  payload: { progress: number; cpm: number; accuracy: number; errors: number }
) {
  return request<{ ok: boolean }>(`/api/rooms/${encodeURIComponent(code)}/progress`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function finishRoom(code: string, payload: { cpm: number; accuracy: number; errors: number; elapsed: number }) {
  return request<Room>(`/api/rooms/${encodeURIComponent(code)}/finish`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function playAgain(code: string, language: string) {
  return request<Room>(`/api/rooms/${encodeURIComponent(code)}/again`, {
    method: "POST",
    body: JSON.stringify({ language }),
  });
}

export type DailyFeedback = "correct" | "present" | "absent";

export interface DailyStats {
  currentStreak: number;
  bestStreak: number;
  totalSolved: number;
  totalPlayed: number;
  accuracy: number;
  avgAttempts: number;
  avgTime: number;
}

export interface DailyRankRow {
  rank: number;
  name: string;
  avatarUrl: string | null;
  attempts: number;
  isMe: boolean;
}

export interface DailyState {
  date: string;
  wordLength: number;
  category: string;
  categoryLabel: string;
  maxAttempts: number;
  attempts: number;
  hintsRevealed: number;
  solved: boolean;
  solvedWord: string | null;
  explanation: string | null;
  hintsShowing: string[];
  stats: DailyStats;
  ranking: DailyRankRow[];
  feedback?: DailyFeedback[];
  attempt?: number;
  alreadySolved?: boolean;
  xpEarned?: number;
}

export function getDailyState() {
  return request<DailyState>("/api/daily/state");
}

export function dailyGuess(guess: string) {
  return request<DailyState>("/api/daily/guess", {
    method: "POST",
    body: JSON.stringify({ guess }),
  });
}

export function dailyInfinite(guess?: string) {
  return request<{
    wordLength: number;
    categoryLabel: string;
    sessionId?: number;
    solved?: boolean;
    feedback?: DailyFeedback[];
    word?: string | null;
    explanation?: string | null;
  }>("/api/daily/infinite", {
    method: "POST",
    body: JSON.stringify({ guess }),
  });
}

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  unlocked: boolean;
}

export function getAchievements() {
  return request<{ unlocked: number; total: number; achievements: Achievement[] }>("/api/achievements");
}

export interface RankRow {
  rank: number;
  id: number;
  name: string;
  avatarUrl: string | null;
  bestWpm: number;
  avgAccuracy: number;
  races: number;
  xp: number;
}

export function getRanking(period: "daily" | "weekly" | "monthly" | "all" = "all") {
  return request<{ period: string; ranking: RankRow[] }>(`/api/ranking?period=${period}`);
}

export interface PublicProfile {
  profile: {
    id: number;
    name: string;
    avatarUrl: string | null;
    xp: number;
    level: number;
    totalRaces: number;
    bestWpm: number;
    bestAccuracy: number;
    languagesPracticed: number;
    favoriteLanguage: string | null;
    worldRank: number | null;
  };
  history: {
    id: number;
    language: string | null;
    wpm: number;
    cpm: number;
    accuracy: number;
    errors: number;
    elapsed: number;
    created_at: string;
  }[];
  achievements: Achievement[];
  unlockedAchievements: number;
}

export function getPublicProfile(ref: string | number) {
  return request<PublicProfile>(`/api/users/${encodeURIComponent(String(ref))}`);
}

export interface InterviewProblem {
  id: string;
  title: string;
  difficulty: string;
}

export function getInterviewProblems() {
  return request<{ languages: string[]; problems: InterviewProblem[] }>("/api/interview/problems");
}

export function fetchInterviewSnippet(language: string, problem: string) {
  return request<SnippetData>(
    `/api/interview/snippet?language=${encodeURIComponent(language)}&problem=${encodeURIComponent(problem)}`
  );
}

export interface LangStat {
  language: string | null;
  races: number;
  avgWpm: number;
  maxWpm: number;
  avgAcc: number;
  totalErrors: number;
  avgTime: number;
}

export function getAdvancedStats() {
  return request<{
    unique: { totalRaces: number; bestWpm: number; bestAccuracy: number; languages: number };
    byLang: LangStat[];
  }>("/api/stats");
}
