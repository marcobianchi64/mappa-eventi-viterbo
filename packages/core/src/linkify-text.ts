import { isHttpUrl } from "./safe-url.js";
import { escapeHtml } from "./utils.js";

const URL_IN_TEXT_RE = /https?:\/\/[^\s<>"']+/gi;

/** Testo con URL cliccabili (descrizioni evento, fonti Facebook, ecc.). */
export function linkifyPlainText(text: string | null | undefined): string {
  if (!text?.trim()) return "";

  const parts: string[] = [];
  let lastIndex = 0;
  const re = new RegExp(URL_IN_TEXT_RE.source, "gi");
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    parts.push(escapeHtml(text.slice(lastIndex, match.index)));

    let url = match[0];
    let trailing = "";
    while (url.length > 12 && /[.,;:!?)]$/.test(url)) {
      trailing = url.slice(-1) + trailing;
      url = url.slice(0, -1);
    }

    if (isHttpUrl(url)) {
      const safeHref = escapeHtml(url);
      parts.push(
        `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" class="atlas-text-link">${safeHref}</a>${escapeHtml(trailing)}`,
      );
    } else {
      parts.push(escapeHtml(match[0]));
    }

    lastIndex = match.index + match[0].length;
  }

  parts.push(escapeHtml(text.slice(lastIndex)));
  return parts.join("");
}
