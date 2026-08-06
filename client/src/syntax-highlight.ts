import Prism from "prismjs";
import "prismjs/components/prism-typescript.js";
import "prismjs/components/prism-python.js";
import "prismjs/components/prism-c.js";
import "prismjs/components/prism-csharp.js";
import "prismjs/components/prism-go.js";
import "prismjs/components/prism-rust.js";
import "prismjs/components/prism-ruby.js";
import "prismjs/components/prism-php.js";
import "prismjs/components/prism-java.js";

interface PrismTokenLike {
  type: string;
  content: string | PrismTokenLike[];
}

const GRAMMARS: Record<string, unknown> = {
  javascript: Prism.languages.javascript,
  js: Prism.languages.javascript,
  node: Prism.languages.javascript,
  typescript: Prism.languages.typescript,
  ts: Prism.languages.typescript,
  python: Prism.languages.python,
  py: Prism.languages.python,
  c: Prism.languages.c,
  csharp: Prism.languages.csharp,
  cs: Prism.languages.csharp,
  "c#": Prism.languages.csharp,
  dotnet: Prism.languages.csharp,
  go: Prism.languages.go,
  golang: Prism.languages.go,
  rust: Prism.languages.rust,
  rs: Prism.languages.rust,
  ruby: Prism.languages.ruby,
  rb: Prism.languages.ruby,
  php: Prism.languages.php,
  java: Prism.languages.java,
};

type TokenGroup =
  | "comment"
  | "string"
  | "number"
  | "constant"
  | "keyword"
  | "function"
  | "type"
  | "operator"
  | "punctuation"
  | "variable"
  | "tag"
  | "attr";

function group(type: string): TokenGroup | null {
  switch (type) {
    case "comment":
    case "prolog":
    case "doctype":
    case "cdata":
      return "comment";
    case "string":
    case "template":
    case "char":
    case "regex":
      return "string";
    case "number":
      return "number";
    case "boolean":
    case "constant":
      return "constant";
    case "keyword":
    case "control-flow":
    case "important":
    case "builtin":
      return "keyword";
    case "function":
    case "method":
    case "function-name":
      return "function";
    case "class-name":
    case "class":
    case "type-name":
      return "type";
    case "operator":
      return "operator";
    case "punctuation":
      return "punctuation";
    case "variable":
    case "parameter":
      return "variable";
    case "tag":
      return "tag";
    case "attr":
    case "attribute":
      return "attr";
    default:
      return null;
  }
}

export const COLORS: Record<TokenGroup, string> = {
  comment: "rgb(139,148,158)",
  string: "rgb(159,204,119)",
  number: "rgb(219,156,102)",
  constant: "rgb(199,176,72)",
  keyword: "rgb(198,120,221)",
  function: "rgb(82,160,238)",
  type: "rgb(222,192,36)",
  operator: "rgb(86,182,194)",
  punctuation: "rgb(148,154,160)",
  variable: "rgb(171,178,191)",
  tag: "rgb(82,160,238)",
  attr: "rgb(209,154,102)",
};

function flatten(tokens: (string | PrismTokenLike)[], out: (TokenGroup | null)[], start: number): number {
  let i = start;
  for (const tok of tokens) {
    if (typeof tok === "string") {
      i += tok.length;
      continue;
    }
    const content = tok.content;
    if (typeof content === "string") {
      const g = group(tok.type);
      const end = i + content.length;
      if (g) {
        for (; i < end; i++) out[i] = g;
      } else {
        i = end;
      }
    } else if (Array.isArray(content)) {
      i = flatten(content, out, i);
    }
  }
  return i;
}

/** Retorna, para cada índice de caractere de `code`, o grupo de sintaxe (ou null). */
export function tokenizeCode(language: string, code: string): (TokenGroup | null)[] {
  const out: (TokenGroup | null)[] = new Array(code.length).fill(null);
  if (!code) return out;
  const grammar = GRAMMARS[(language || "").toLowerCase()];
  if (!grammar) return out;
  try {
    const tokens = Prism.tokenize(code, grammar as never) as unknown as (string | PrismTokenLike)[];
    flatten(tokens, out, 0);
  } catch {
    // falha de tokenização não deve quebrar a digitação
  }
  return out;
}

export function tokenColor(token: string | null): string | undefined {
  if (!token) return undefined;
  return (COLORS as Record<string, string>)[token] ?? undefined;
}