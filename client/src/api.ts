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

export type ChallengeDifficulty = "easy" | "medium" | "hard";

export interface ChallengeSummary {
  id: string;
  title: string;
  difficulty: ChallengeDifficulty;
  xp: number;
  summary: string;
  languages: string[];
}

export interface ChallengeDetail extends ChallengeSummary {
  description: string;
  testsCount: number;
  starters: Record<string, string>;
}

export interface RunTest {
  passed: boolean;
  input?: unknown;
  got?: string;
  error?: string;
}

export interface RunResult {
  status: "ok" | "compile_error" | "runtime_error" | "error";
  passed: number;
  total: number;
  tests: RunTest[];
  detail?: string;
  xpEarned: number;
  solved: boolean;
  level: LevelInfo | null;
}

export function fetchChallengeList() {
  return request<{ challenges: ChallengeSummary[] }>("/api/challenges");
}

export function fetchChallenge(id: string) {
  return request<{ challenge: ChallengeDetail }>(`/api/challenges/${encodeURIComponent(id)}`);
}

export function runChallenge(id: string, payload: { language: string; code: string }) {
  return request<RunResult>(`/api/challenges/${encodeURIComponent(id)}/run`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
