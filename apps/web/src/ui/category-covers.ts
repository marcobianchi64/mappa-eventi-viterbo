import { getCategoryMeta, type EventCategory } from "@atlas/core";

/** Foto segnaposto per categoria (in public/covers/{category}/01.jpg …). */
export const COVER_VARIANTS_PER_CATEGORY = 10;

const COVER_BASE = "./covers";

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Indice variante stabile per evento (stesso evento → stessa cover). */
export function getCategoryCoverVariant(category: EventCategory, seed: string): number {
  const key = `${category}:${seed || "atlas"}`;
  return hashSeed(key) % COVER_VARIANTS_PER_CATEGORY;
}

/** Percorso foto locale (generata da npm run fetch:covers). */
export function getCategoryCoverImageSrc(category: EventCategory, seed: string): string {
  const variant = getCategoryCoverVariant(category, seed);
  const num = String(variant + 1).padStart(2, "0");
  return `${COVER_BASE}/${category}/${num}.jpg`;
}

export function categoryCoverSeed(event: { date_event?: string | null; title?: string | null }): string {
  return String(event.date_event ?? event.title ?? "atlas");
}

function categoryDataAttr(category: EventCategory): string {
  return ` data-category="${category}"`;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function coverImgTag(category: EventCategory, seed: string): string {
  const variant = getCategoryCoverVariant(category, seed);
  const src = escapeAttr(getCategoryCoverImageSrc(category, seed));
  return `<img class="category-cover-img" src="${src}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-cover-variant="${variant}" aria-hidden="true" onerror="this.closest('.category-cover')?.classList.add('category-cover-missing')" />`;
}

export function renderListCategoryCover(category: EventCategory, seed: string): string {
  const variant = getCategoryCoverVariant(category, seed);
  return `<div class="list-card-media category-cover category-cover-photo"${categoryDataAttr(category)} data-cover-seed="${escapeAttr(seed)}" data-cover-variant="${variant}">
    ${coverImgTag(category, seed)}
  </div>`;
}

export function renderSheetCategoryCover(
  category: EventCategory,
  seed: string,
  badgeHtml: string,
): string {
  const variant = getCategoryCoverVariant(category, seed);
  return `<div class="stable-event-cover category-cover category-cover-photo"${categoryDataAttr(category)} data-cover-seed="${escapeAttr(seed)}" data-cover-variant="${variant}">
    ${coverImgTag(category, seed)}
    ${badgeHtml}
  </div>`;
}

/** @deprecated Usare getCategoryCoverImageSrc — mantenuto per compatibilità tooltip. */
export function renderCategoryCoverSvg(category: EventCategory, seed: string): string {
  const src = escapeAttr(getCategoryCoverImageSrc(category, seed));
  return `<img class="category-cover-img" src="${src}" alt="" loading="lazy" decoding="async" aria-hidden="true" />`;
}

/** Ripristina cover segnaposto dopo errore caricamento foto reale. */
export function applyCategoryCoverFallback(
  container: HTMLElement,
  category: EventCategory,
  seed: string,
  badgeHtml = "",
): void {
  const variant = getCategoryCoverVariant(category, seed);
  const isSheet = container.classList.contains("stable-event-cover");
  container.classList.remove("has-img", "is-loaded", "img-error");
  container.classList.add("category-cover", "category-cover-photo");
  container.dataset.coverSeed = seed;
  container.dataset.coverVariant = String(variant);
  container.style.background = "";
  container.innerHTML = `${coverImgTag(category, seed)}${badgeHtml}`;
  if (!isSheet) container.classList.add("list-card-media");
}

export function categoryCoverLabel(category: EventCategory): string {
  return getCategoryMeta(category).label;
}
