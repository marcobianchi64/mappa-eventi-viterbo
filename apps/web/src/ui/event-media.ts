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

/** Area locandina 16:9 per card elenco eventi. */
export function renderListCardMedia(event: AtlasEvent): string {
  const category = getDisplayCategory(event);
  if (isHttpUrl(event.image_url)) {
    const src = escapeHtml(event.image_url!);
    return `<div class="list-card-media has-img"${categoryDataAttr(category)}${coverSeedAttr(event)} data-event-media>
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
  const imageUrl = isHttpUrl(event.image_url) ? escapeHtml(event.image_url) : "";

  if (imageUrl) {
    return {
      category,
      coverHtml: `<div class="stable-event-cover has-img"${categoryDataAttr(category)}${coverSeedAttr(event)} data-event-media>
        <div class="event-media-skeleton" aria-hidden="true"></div>
        <img class="event-media-img" src="${imageUrl}" alt="" decoding="async" referrerpolicy="no-referrer" />
        ${badge}
      </div>`,
    };
  }

  return {
    category,
    coverHtml: renderSheetCategoryCover(category, categoryCoverSeed(event), badge),
  };
}

/** Fade-in al caricamento; fallback illustrazione categoria se l'immagine fallisce. */
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
      applyCategoryCoverFallback(container, category, seed, badge);
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
}

/** Cover compatta per tooltip mappa (senza foto reale). */
export function renderMapTooltipCategoryCover(event: AtlasEvent): string {
  const category = getDisplayCategory(event);
  if (isHttpUrl(event.image_url)) return "";
  const seed = categoryCoverSeed(event);
  return `<div class="event-preview-category-cover category-cover category-cover-photo" data-category="${category}" data-cover-variant="${getCategoryCoverVariant(category, seed)}">
    ${renderCategoryCoverSvg(category, seed)}
  </div>`;
}
