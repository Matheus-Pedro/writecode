import { LANGUAGES } from "./languages.js";
import { extractChunk } from "./snippets.js";

const GH_API = "https://api.github.com";
const RAW = "https://raw.githubusercontent.com";
const TOKEN = process.env.GITHUB_TOKEN || "";

function headers() {
  const h = { "User-Agent": "writecode", Accept: "application/vnd.github+json" };
  if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
  return h;
}

async function api(url) {
  const res = await fetch(GH_API + url, { headers: headers() });
  if (res.status === 403 && !TOKEN) {
    throw new Error(
      "Limite de requisições do GitHub API atingido. Configure GITHUB_TOKEN no servidor ou tente novamente em instantes."
    );
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

async function getDefaultBranch(owner, repo) {
  try {
    const r = await api(`/repos/${owner}/${repo}`);
    return r.default_branch || "main";
  } catch {
    return "main";
  }
}

async function listFiles(owner, repo, branch) {
  try {
    const data = await api(`/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
    if (data.tree && data.truncated === true) {
      throw new Error("truncated");
    }
    return data.tree || [];
  } catch {
    try {
      const alt = branch === "main" ? "master" : "main";
      const data = await api(`/repos/${owner}/${repo}/git/trees/${encodeURIComponent(alt)}?recursive=1`);
      return data.tree || [];
    } catch {
      return [];
    }
  }
}

function pickCandidateFiles(files, language) {
  const cfg = LANGUAGES[language];
  return files.filter((f) => {
    if (f.type !== "blob" || typeof f.size !== "number") return false;
    if (f.size < 400 || f.size > 40000) return false;
    const path = f.path.toLowerCase();
    if (!cfg.extensions.some((ext) => path.endsWith("." + ext))) return false;
    if (/(^|\/)(test|tests|spec|fixture|fixtures|docs|doc|example|examples|sample|samples|node_modules|dist|vendor|build|generated|mock|mocks|scripts)\//.test(path)) return false;
    if (/\.min\./.test(path) || /__pycache__|\.ipynb|\.lock|package-lock/.test(path)) return false;
    if (path.split("/").some((p) => p.startsWith("."))) return false;
    return true;
  });
}

export async function githubRandom(language) {
  const cfg = LANGUAGES[language];
  if (!cfg) throw new Error("Linguagem não suportada.");
  const repos = [...cfg.defaults].sort(() => Math.random() - 0.5);
  let lastError = "Nenhum repositório disponível.";
  for (const repo of repos) {
    const [owner, name] = repo.split("/");
    try {
      return await githubFromRepo(language, owner, name);
    } catch (e) {
      lastError = e.message;
    }
  }
  throw new Error(lastError);
}

export async function githubFromRepo(language, owner, repo) {
  const cfg = LANGUAGES[language];
  if (!cfg) throw new Error("Linguagem não suportada.");
  const branch = await getDefaultBranch(owner, repo);
  const files = await listFiles(owner, repo, branch);
  const candidates = pickCandidateFiles(files, language);
  if (!candidates.length) {
    throw new Error("Nenhum arquivo adequado encontrado no repositório.");
  }
  const file = candidates[Math.floor(Math.random() * candidates.length)];
  const rawPath = file.path
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  const rawUrl = `${RAW}/${owner}/${repo}/${branch}/${rawPath}`;
  const res = await fetch(rawUrl, { headers: { "User-Agent": "writecode" } });
  if (!res.ok) {
    throw new Error(`Falha ao baixar arquivo (${res.status}): ${file.path}`);
  }
  const text = await res.text();
  const code = extractChunk(text);
  return { code, source: `${owner}/${repo}`, path: file.path };
}
