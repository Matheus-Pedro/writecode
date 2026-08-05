import raw from "../../shared/languages.json";

export interface LanguageDef {
  id: string;
  name: string;
  glyph: string;
  icon: string;
  desc: string;
}

interface LanguageSource extends LanguageDef {
  extensions: string[];
  aiName: string;
  defaults: string[];
}

const source = raw as LanguageSource[];

export const LANGUAGES: Record<string, LanguageDef> = Object.fromEntries(
  source.map((l) => [{ id: l.id, name: l.name, glyph: l.glyph, icon: l.icon, desc: l.desc }])
);

export const LANGUAGE_ORDER: string[] = source.map((l) => l.id);

export function deviconUrl(slug: string): string {
  return `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${slug}/${slug}-original.svg`;
}

export interface DifficultyDef {
  id: "easy" | "medium" | "hard";
  label: string;
  hint: string;
}

export const DIFFICULTIES: DifficultyDef[] = [
  { id: "easy", label: "Fácil", hint: "8–14 linhas" },
  { id: "medium", label: "Médio", hint: "18–30 linhas" },
  { id: "hard", label: "Difícil", hint: "30–45 linhas" },
];
