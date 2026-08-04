import { readFileSync } from "node:fs";

const file = new URL("../../shared/languages.json", import.meta.url);
const data = JSON.parse(readFileSync(file, "utf8"));

export const LANGUAGES = Object.fromEntries(data.map((lang) => [lang.id, lang]));
export const LANGUAGE_LIST = data;
