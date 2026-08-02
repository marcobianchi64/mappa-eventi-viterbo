import {
  escapeHtml,
  getDisplayCategory,
  getCategoryMeta,
  isHttpUrl,
  type AtlasEvent,
  type EventCategory,
} from "@atlas/core";

/** Attributi img per locandine esterne (evita blocchi hotlink). */
export const EVENT_MEDIA_IMG_ATTRS =
  'loading="lazy" decoding="async" referrerpolicy="no-referrer"';


function categoryDataAttr(category: EventCategory): string {
  return ` data-category="${category}"`;
}

/** Area locandina 16:9 per card elenco eventi. */
export function renderListCardMedia(event: AtlasEvent): string {
  const category = getDisplayCategory(event);
  const meta = getCategoryMeta(category);
  if (isHttpUrl(event.image_url)) {
    const src = escapeHtml(event.image_url!);
    return `<div class="list-card-media has-img"${categoryDataAttr(category)} data-event-media>
      <div class="event-media-skeleton" aria-hidden="true"></div>
      <img class="event-media-img" src="${src}" alt="" ${EVENT_MEDIA_IMG_ATTRS} />
    </div>`;
  }
  return `<div class="list-card-media placeholder"${categoryDataAttr(category)} style="background:linear-gradient(135deg, ${meta.color}, ${meta.color}99)"><span>${meta.icon}</span></div>`;
}

export interface EventSheetCoverParts {
  coverHtml: string;
  category: EventCategory;
}

/** Cover scheda evento: immagine og o gradiente categoria. */
export function renderEventSheetCover(event: AtlasEvent): EventSheetCoverParts {
  const category = getDisplayCategory(event);
  const meta = getCategoryMeta(category);
  const imageUrl = isHttpUrl(event.image_url) ? escapeHtml(event.image_url) : "";

  if (imageUrl) {
    return {
      category,
      coverHtml: `<div class="stable-event-cover has-img"${categoryDataAttr(category)} data-event-media>
        <div class="event-media-skeleton" aria-hidden="true"></div>
        <img class="event-media-img" src="${imageUrl}" alt="" decoding="async" referrerpolicy="no-referrer" />
        <div class="stable-event-badge" style="color:${meta.color}">${meta.label}</div>
      </div>`,
    };
  }

  return {
    category,
    coverHtml: `<div class="stable-event-cover ${category}-cover">
      <div class="stable-event-cover-icon">${meta.icon}</div>
      <div class="stable-event-badge" style="color:${meta.color}">${meta.label}</div>
    </div>`,
  };
}

/** Fade-in al caricamento; fallback gradiente se l'immagine fallisce. */
export function bindEventMediaImages(root: ParentNode): void {
  root.querySelectorAll<HTMLImageElement>("[data-event-media] .event-media-img").forEach((img) => {
    const container = img.closest<HTMLElement>("[data-event-media]");
    if (!container) return;

    const onLoaded = () => {
      container.classList.add("is-loaded");
    };

    const onError = () => {
      const category = (container.dataset.category as EventCategory | undefined) ?? "other";
      const meta = getCategoryMeta(category);
      container.classList.remove("has-img", "is-loaded");
      container.classList.add("placeholder", "img-error");

      if (container.classList.contains("stable-event-cover")) {
        container.classList.add(`${category}-cover`);
        container.innerHTML = `<div class="stable-event-cover-icon">${meta.icon}</div>`;
        return;
      }

      container.style.background = `linear-gradient(135deg, ${meta.color}, ${meta.color}99)`;
      container.innerHTML = `<span>${meta.icon}</span>`;
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
