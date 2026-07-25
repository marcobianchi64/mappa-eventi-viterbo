import {
  CATEGORY_META,
  escapeHtml,
  formatEventSchedule,
  getDisplayCategory,
  getEventComuneDisplayLabel,
  getEventDisplayTitle,
  getCategoryMeta,
  isHttpUrl,
  type AtlasEvent,
  type EventCategory,
} from "@atlas/core";

export type EventListCategoryFilter = EventCategory | "all";

export function renderEventListCategoryChips(active: EventListCategoryFilter): string {
  const chips: { key: EventListCategoryFilter; label: string; color?: string }[] = [
    { key: "all", label: "Tutti" },
    ...(Object.keys(CATEGORY_META) as EventCategory[]).map((key) => ({
      key,
      label: CATEGORY_META[key].label,
      color: CATEGORY_META[key].color,
    })),
  ];

  return chips
    .map((chip) => {
      const isActive = chip.key === active;
      const style = chip.color && chip.key !== "all" ? ` style="--chip-cat:${chip.color}"` : "";
      return `<button type="button" class="event-list-cat${isActive ? " active" : ""}" data-list-cat="${chip.key}"${style}>${escapeHtml(chip.label)}</button>`;
    })
    .join("");
}

function listItemThumb(event: AtlasEvent): string {
  const category = getDisplayCategory(event);
  const meta = getCategoryMeta(category);
  if (isHttpUrl(event.image_url)) {
    const src = escapeHtml(event.image_url!);
    return `<div class="event-list-thumb has-img"><img src="${src}" alt="" loading="lazy" onerror="this.parentElement.classList.remove('has-img')"/></div>`;
  }
  return `<div class="event-list-thumb" style="background:${meta.color}"><span>${meta.icon}</span></div>`;
}

export function renderEventListHtml(
  events: AtlasEvent[],
  activeCategory: EventListCategoryFilter,
): string {
  const chips = renderEventListCategoryChips(activeCategory);
  if (events.length === 0) {
    return `
      <div class="event-list-cats" role="group" aria-label="Categoria">${chips}</div>
      <p class="event-list-empty">Nessun evento nel periodo e nei filtri scelti.</p>
    `;
  }

  const items = events
    .map((event) => {
      const id = escapeHtml(event.date_event ?? "");
      const title = escapeHtml(getEventDisplayTitle(event));
      const when = escapeHtml(formatEventSchedule(event));
      const place = escapeHtml(getEventComuneDisplayLabel(event) || event.venue || "");
      return `
        <button type="button" class="event-list-item" data-event-id="${id}">
          ${listItemThumb(event)}
          <div class="event-list-item-body">
            <strong>${title}</strong>
            <span class="event-list-when">${when}</span>
            ${place ? `<span class="event-list-place">${place}</span>` : ""}
          </div>
        </button>
      `;
    })
    .join("");

  return `
    <div class="event-list-cats" role="group" aria-label="Categoria">${chips}</div>
    <p class="event-list-count">${events.length} eventi</p>
    <div class="event-list-scroll">${items}</div>
  `;
}

export function bindEventList(
  root: HTMLElement,
  onCategory: (cat: EventListCategoryFilter) => void,
  onSelect: (eventId: string) => void,
): void {
  root.querySelectorAll("[data-list-cat]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = (btn as HTMLButtonElement).dataset.listCat as EventListCategoryFilter;
      onCategory(key);
    });
  });
  root.querySelectorAll("[data-event-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = (btn as HTMLButtonElement).dataset.eventId;
      if (id) onSelect(id);
    });
  });
}
