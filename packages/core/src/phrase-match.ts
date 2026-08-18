/** Match parola/frase intera (es. «orte» non deve matchare «pianoforte»). */
export function textIncludesWholePhrase(haystack: string, phrase: string): boolean {
  const h = normalizePhraseText(haystack);
  const p = normalizePhraseText(phrase);
  if (!h || !p) return false;
  if (h === p) return true;

  const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const boundary = /[\s,.;:()[\]'"\u2013\u2014-]/;
  const re = new RegExp(`(^|${boundary.source})${escaped}($|${boundary.source})`);
  return re.test(h);
}

function normalizePhraseText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u2032\u00B4`]/g, "'")
    .replace(/['']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
