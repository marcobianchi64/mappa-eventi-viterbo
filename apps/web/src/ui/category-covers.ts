import { getCategoryMeta, type EventCategory } from "@atlas/core";

/** Enogastronomia e sport: foto locali a rotazione se manca la locandina reale. */
export const PHOTO_COVER_CATEGORIES = ["food", "sport"] as const;
export type PhotoCoverCategory = (typeof PHOTO_COVER_CATEGORIES)[number];

export const FOOD_COVER_COUNT = 7;
export const SPORT_COVER_COUNT = 10;
export const PLACEHOLDER_COVER_CAPTION = "foto sostitutiva provvisoria";

export const COVER_VARIANTS_PER_CATEGORY = 10;

function coversBaseUrl(): string {
  const base = typeof import.meta !== "undefined" && import.meta.env?.BASE_URL ? import.meta.env.BASE_URL : "./";
  const normalized = base.endsWith("/") ? base : `${base}/`;
  return `${normalized}covers`;
}

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function coverVariantCount(category: EventCategory): number {
  if (category === "food") return FOOD_COVER_COUNT;
  if (category === "sport") return SPORT_COVER_COUNT;
  return COVER_VARIANTS_PER_CATEGORY;
}

export function usesCategoryPhotoCover(category: EventCategory): category is PhotoCoverCategory {
  return (PHOTO_COVER_CATEGORIES as readonly string[]).includes(category);
}

export function getCategoryCoverVariant(category: EventCategory, seed: string): number {
  const key = `${category}:${seed || "atlas"}`;
  return hashSeed(key) % coverVariantCount(category);
}

export function getCategoryCoverImageSrc(category: PhotoCoverCategory, seed: string): string {
  const variant = getCategoryCoverVariant(category, seed);
  if (category === "food") {
    return `${coversBaseUrl()}/food/foto${variant + 1}.jpg`;
  }
  const num = String(variant + 1).padStart(2, "0");
  return `${coversBaseUrl()}/${category}/${num}.jpg`;
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

function coverCaptionHtml(): string {
  return `<span class="category-cover-caption">${PLACEHOLDER_COVER_CAPTION}</span>`;
}

function coverImgTag(category: PhotoCoverCategory, seed: string): string {
  const variant = getCategoryCoverVariant(category, seed);
  const src = escapeAttr(getCategoryCoverImageSrc(category, seed));
  return `<img class="category-cover-img" src="${src}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-cover-variant="${variant}" aria-hidden="true" />`;
}

function renderPhotoCoverInner(category: PhotoCoverCategory, seed: string, badgeHtml = ""): string {
  return `${coverImgTag(category, seed)}${coverCaptionHtml()}${badgeHtml}`;
}

/** Gradiente + icona categoria. */
export function renderListCategoryIconCover(category: EventCategory, seed: string): string {
  const meta = getCategoryMeta(category);
  const variant = getCategoryCoverVariant(category, seed);
  return `<div class="list-card-media placeholder category-cover category-cover-icon"${categoryDataAttr(category)} data-cover-seed="${escapeAttr(seed)}" data-cover-variant="${variant}" style="background:linear-gradient(135deg, ${meta.color}, ${meta.color}99)"><span class="category-cover-emoji">${meta.icon}</span></div>`;
}

export function renderSheetCategoryIconCover(
  category: EventCategory,
  seed: string,
  badgeHtml: string,
): string {
  const meta = getCategoryMeta(category);
  const variant = getCategoryCoverVariant(category, seed);
  return `<div class="stable-event-cover ${category}-cover category-cover category-cover-icon"${categoryDataAttr(category)} data-cover-seed="${escapeAttr(seed)}" data-cover-variant="${variant}">
    <div class="stable-event-cover-icon">${meta.icon}</div>
    ${badgeHtml}
  </div>`;
}

export function renderListCategoryCover(category: EventCategory, seed: string): string {
  if (!usesCategoryPhotoCover(category)) {
    return renderListCategoryIconCover(category, seed);
  }
  const variant = getCategoryCoverVariant(category, seed);
  return `<div class="list-card-media category-cover category-cover-photo category-cover-custom"${categoryDataAttr(category)} data-cover-seed="${escapeAttr(seed)}" data-cover-variant="${variant}">
    ${renderPhotoCoverInner(category, seed)}
  </div>`;
}

export function renderSheetCategoryCover(
  category: EventCategory,
  seed: string,
  badgeHtml: string,
): string {
  if (!usesCategoryPhotoCover(category)) {
    return renderSheetCategoryIconCover(category, seed, badgeHtml);
  }
  const variant = getCategoryCoverVariant(category, seed);
  return `<div class="stable-event-cover category-cover category-cover-photo category-cover-custom"${categoryDataAttr(category)} data-cover-seed="${escapeAttr(seed)}" data-cover-variant="${variant}">
    ${renderPhotoCoverInner(category, seed, badgeHtml)}
  </div>`;
}

export function renderCategoryCoverSvg(category: EventCategory, seed: string): string {
  if (!usesCategoryPhotoCover(category)) {
    const meta = getCategoryMeta(category);
    return `<span class="category-cover-emoji">${meta.icon}</span>`;
  }
  const src = escapeAttr(getCategoryCoverImageSrc(category, seed));
  return `<img class="category-cover-img" src="${src}" alt="" loading="lazy" decoding="async" aria-hidden="true" />`;
}

export function applyCategoryCoverFallback(
  container: HTMLElement,
  category: EventCategory,
  seed: string,
  badgeHtml = "",
  preferIcon = false,
): void {
  const isSheet = container.classList.contains("stable-event-cover");
  container.classList.remove(
    "has-img",
    "is-loaded",
    "img-error",
    "category-cover-photo",
    "category-cover-icon",
    "category-cover-custom",
    "category-cover-missing",
  );
  container.classList.add("category-cover");
  container.dataset.coverSeed = seed;
  container.dataset.coverVariant = String(getCategoryCoverVariant(category, seed));
  container.style.background = "";

  const usePhoto = usesCategoryPhotoCover(category) && !preferIcon;

  if (usePhoto) {
    container.classList.add("category-cover-photo", "category-cover-custom");
    container.innerHTML = renderPhotoCoverInner(category, seed, badgeHtml);
  } else {
    const meta = getCategoryMeta(category);
    container.classList.add("category-cover-icon", "placeholder");
    if (isSheet) {
      container.classList.add(`${category}-cover`);
      container.innerHTML = `<div class="stable-event-cover-icon">${meta.icon}</div>${badgeHtml}`;
    } else {
      container.style.background = `linear-gradient(135deg, ${meta.color}, ${meta.color}99)`;
      container.innerHTML = `<span class="category-cover-emoji">${meta.icon}</span>`;
      container.classList.add("list-card-media");
    }
    return;
  }
  if (!isSheet) container.classList.add("list-card-media");
}

export function categoryCoverLabel(category: EventCategory): string {
  return getCategoryMeta(category).label;
}
