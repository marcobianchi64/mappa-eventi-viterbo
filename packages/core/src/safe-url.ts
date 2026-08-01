/** URL http(s) sicuri per link e immagini in UI. */
export function isHttpUrl(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function openHttpUrl(value: string | null | undefined): boolean {
  if (!isHttpUrl(value)) return false;
  window.open(value!.trim(), "_blank", "noopener,noreferrer");
  return true;
}
