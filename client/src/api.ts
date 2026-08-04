export interface SnippetData {
  code: string;
  source: string;
  path: string | null;
}

export interface ApiConfig {
  aiEnabled: boolean;
  languages: string[];
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
