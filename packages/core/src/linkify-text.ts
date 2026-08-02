import { isHttpUrl } from "./safe-url.js";
import { escapeHtml } from "./utils.js";

const URL_IN_TEXT_RE = /https?:\/\/[^\s<>"']+/gi;

/** True se l'URL punta a Facebook (pagine, post, eventi). */
export function isFacebookUrl(value: string | null | undefined): boolean {
  if (!value?.trim() || !isHttpUrl(value)) return false;
  try {
    const host = new URL(value.trim()).hostname.toLowerCase();
    return (
      host === "facebook.com" ||
      host.endsWith(".facebook.com") ||
      host === "fb.com" ||
      host === "fb.me"
    );
  } catch {
    return false;
  }
}

/** Testo con link cliccabili solo per pagine Facebook nelle descrizioni. */
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

    if (isFacebookUrl(url)) {
      const safeHref = escapeHtml(url);
      parts.push(
        `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" class="atlas-text-link">${safeHref}</a>${escapeHtml(trailing)}`,
      );
    } else {
      parts.push(escapeHtml(match[0]) + escapeHtml(trailing));
    }

    lastIndex = match.index + match[0].length;
  }

  parts.push(escapeHtml(text.slice(lastIndex)));
  return parts.join("");
}
