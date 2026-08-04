export function normalize(text) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\t/g, "    ");
}

export function extractChunk(text, maxLines = 32) {
  const lines = normalize(text).split("\n");
  if (lines.length <= maxLines + 4) {
    return lines.join("\n");
  }
  const maxStart = lines.length - maxLines - 1;
  const candidates = [];
  for (let i = 0; i <= maxStart; i++) {
    const t = lines[i].trim();
    if (t && !t.startsWith("#") && !t.startsWith("//") && !t.startsWith("/*") && !t.startsWith("*")) {
      candidates.push(i);
    }
  }
  const pool = candidates.length ? candidates : [Math.floor(Math.random() * (maxStart + 1))];
  const start = pool[Math.floor(Math.random() * pool.length)];
  const count = Math.min(maxLines, lines.length - start);
  return lines.slice(start, start + count).join("\n");
}
