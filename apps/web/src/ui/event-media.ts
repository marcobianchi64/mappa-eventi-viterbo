import {
  escapeHtml,
  getDisplayCategory,
  getCategoryMeta,
  isHttpUrl,
  type AtlasEvent,
  type EventCategory,
} from "@atlas/core";
import {
  applyCategoryCoverFallback,
  categoryCoverSeed,
  getCategoryCoverVariant,
  renderListCategoryCover,
  renderSheetCategoryCover,
  renderCategoryCoverSvg,
  usesCategoryPhotoCover,
} from "./category-covers.js";

/** Attributi img per locandine esterne (evita blocchi hotlink). */
export const EVENT_MEDIA_IMG_ATTRS =
  'loading="lazy" decoding="async" referrerpolicy="no-referrer"';

function categoryDataAttr(category: EventCategory): string {
  return ` data-category="${category}"`;
}

function coverSeedAttr(event: AtlasEvent): string {
  const seed = categoryCoverSeed(event);
  return ` data-cover-seed="${escapeHtml(seed)}"`;
}

/** URL locandina reale dell'evento (mai sostituita da foto stock). */
export function getEventMediaUrl(event: AtlasEvent): string | null {
  const raw = event.image_url?.trim();
  if (!raw) return null;
  const normalized = raw.startsWith("//") ? `https:${raw}` : raw;
  return isHttpUrl(normalized) ? normalized : null;
}

/** Area locandina 16:9 per card elenco eventi. */
export function renderListCardMedia(event: AtlasEvent): string {
  const category = getDisplayCategory(event);
  const mediaUrl = getEventMediaUrl(event);
  if (mediaUrl) {
    const src = escapeHtml(mediaUrl);
    return `<div class="list-card-media has-img"${categoryDataAttr(category)}${coverSeedAttr(event)} data-event-media data-real-cover="1">
      <div class="event-media-skeleton" aria-hidden="true"></div>
      <img class="event-media-img" src="${src}" alt="" ${EVENT_MEDIA_IMG_ATTRS} />
    </div>`;
  }
  return renderListCategoryCover(category, categoryCoverSeed(event));
}

export interface EventSheetCoverParts {
  coverHtml: string;
  category: EventCategory;
}

/** Cover scheda evento: foto reale o illustrazione categoria. */
export function renderEventSheetCover(event: AtlasEvent): EventSheetCoverParts {
  const category = getDisplayCategory(event);
  const meta = getCategoryMeta(category);
  const badge = `<div class="stable-event-badge" style="color:${meta.color}">${meta.label}</div>`;
  const imageUrl = getEventMediaUrl(event);

  if (imageUrl) {
    return {
      category,
      coverHtml: `<div class="stable-event-cover has-img"${categoryDataAttr(category)}${coverSeedAttr(event)} data-event-media data-real-cover="1">
        <div class="event-media-skeleton" aria-hidden="true"></div>
        <img class="event-media-img" src="${escapeHtml(imageUrl)}" alt="" decoding="async" referrerpolicy="no-referrer" />
        ${badge}
      </div>`,
    };
  }

  return {
    category,
    coverHtml: renderSheetCategoryCover(category, categoryCoverSeed(event), badge),
  };
}

/** Fade-in al caricamento; fallback se l'immagine fallisce. */
export function bindEventMediaImages(root: ParentNode): void {
  root.querySelectorAll<HTMLImageElement>("[data-event-media] .event-media-img").forEach((img) => {
    const container = img.closest<HTMLElement>("[data-event-media]");
    if (!container) return;

    const onLoaded = () => {
      container.classList.add("is-loaded");
    };

    const onError = () => {
      const category = (container.dataset.category as EventCategory | undefined) ?? "other";
      const seed = container.dataset.coverSeed ?? "atlas";
      const badge = container.querySelector(".stable-event-badge")?.outerHTML ?? "";
      const hadRealCover = container.dataset.realCover === "1";
      // Locandina reale fallita → icona; mai foto sostitutiva al posto dell'originale
      applyCategoryCoverFallback(container, category, seed, badge, hadRealCover);
    };

    if (img.complete && img.naturalWidth > 0) {
      onLoaded();
      return;
    }

    if (img.complete && img.naturalWidth === 0 && img.currentSrc) {
      onError();
      return;
    }

    img.addEventListener("load", onLoaded, { once: true });
    img.addEventListener("error", onError, { once: true });
  });

  bindCategoryCoverImages(root);
}

/** Se foto1…foto7 mancano, torna all'icona invece del riquadro grigio. */
export function bindCategoryCoverImages(root: ParentNode): void {
  root.querySelectorAll<HTMLImageElement>(".category-cover-photo .category-cover-img").forEach((img) => {
    if (img.dataset.coverBound === "1") return;
    img.dataset.coverBound = "1";

    img.addEventListener(
      "error",
      () => {
        const container = img.closest<HTMLElement>(".category-cover");
        if (!container || container.classList.contains("category-cover-icon")) return;
        const category = (container.dataset.category as EventCategory | undefined) ?? "other";
        const seed = container.dataset.coverSeed ?? "atlas";
        const badge = container.querySelector(".stable-event-badge")?.outerHTML ?? "";
        applyCategoryCoverFallback(container, category, seed, badge, true);
      },
      { once: true },
    );
  });
}

/** Cover compatta per tooltip mappa (senza foto reale). */
export function renderMapTooltipCategoryCover(event: AtlasEvent): string {
  const category = getDisplayCategory(event);
  if (getEventMediaUrl(event)) return "";
  const seed = categoryCoverSeed(event);
  if (!usesCategoryPhotoCover(category)) {
    const meta = getCategoryMeta(category);
    return `<div class="event-preview-category-cover category-cover-icon placeholder" data-category="${category}" style="background:linear-gradient(135deg, ${meta.color}, ${meta.color}99)"><span class="category-cover-emoji">${meta.icon}</span></div>`;
  }
  const variant = getCategoryCoverVariant(category, seed);
  return `<div class="event-preview-category-cover category-cover category-cover-photo category-cover-custom" data-category="${category}" data-cover-variant="${variant}">
    ${renderCategoryCoverSvg(category, seed)}
    <span class="category-cover-caption">foto sostitutiva provvisoria</span>
  </div>`;
}
