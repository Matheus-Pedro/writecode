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
  created_at: string;
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
  return request<{ result: ResultRow }>("/api/results", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getResults() {
  return request<{ results: ResultRow[] }>("/api/results");
}
