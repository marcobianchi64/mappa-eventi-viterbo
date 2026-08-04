import {
  CATEGORY_META,
  DATE_RANGE_LABELS,
  escapeHtml,
  formatEventSchedule,
  getDisplayCategory,
  getEditionListTitle,
  getEditionTerritoryLabel,
  getEventComuneDisplayLabel,
  getEventDisplayTitle,
  getCategoryMeta,
  type AtlasEvent,
  type DateRangeKey,
  type EventCategory,
} from "@atlas/core";
import { bindEventMediaImages, renderListCardMedia } from "./event-media.js";

export type EventListCategoryFilter = EventCategory | "all";

function excerpt(text: string | null | undefined, max = 200): string {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "Scopri date, luogo e dettagli aprendo la scheda evento.";
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function filterSummary(
  activeCategory: EventListCategoryFilter,
  activeRange: DateRangeKey,
): string {
  const parts: string[] = [];
  if (activeCategory !== "all") {
    parts.push(CATEGORY_META[activeCategory].label);
  }
  parts.push(DATE_RANGE_LABELS[activeRange] ?? activeRange);
  return parts.join(" · ");
}

export function renderEventListPageHtml(
  events: AtlasEvent[],
  activeCategory: EventListCategoryFilter,
  activeRange: DateRangeKey,
): string {
  const summary = escapeHtml(filterSummary(activeCategory, activeRange));
  const cards =
    events.length === 0
      ? `<p class="list-page-empty">Nessun evento per i filtri scelti. Usa <strong>Filtra</strong> in alto per cambiare categoria o periodo.</p>`
      : events
          .map((event) => {
            const id = escapeHtml(event.date_event ?? "");
            const title = escapeHtml(getEventDisplayTitle(event));
            const category = getDisplayCategory(event);
            const meta = getCategoryMeta(category);
            const when = escapeHtml(formatEventSchedule(event));
            const place = escapeHtml(getEventComuneDisplayLabel(event) || event.venue || "");
            const desc = escapeHtml(excerpt(event.description));
            return `
        <article class="list-card">
          <button type="button" class="list-card-hit" data-event-id="${id}">
            ${renderListCardMedia(event)}
            <div class="list-card-body">
              <h2 class="list-card-title">${title}</h2>
              <p class="list-card-excerpt">${desc}</p>
              <div class="list-card-meta">
                <span class="list-card-meta-item list-card-meta-date">📅 ${when}</span>
                <span class="list-card-meta-item list-card-meta-category" style="color:${meta.color}">🏷 ${escapeHtml(meta.label)}</span>
                ${place ? `<span class="list-card-meta-item list-card-meta-place">📍 ${place}</span>` : ""}
              </div>
            </div>
          </button>
        </article>
      `;
          })
          .join("");

  return `
    <div class="list-page-layout">
      <header class="list-page-hero">
        <p class="list-page-kicker">${escapeHtml(getEditionTerritoryLabel())}</p>
        <div class="list-page-title-row">
          <h1>${escapeHtml(getEditionListTitle())}</h1>
          <p class="list-page-lead"><strong>${summary}</strong> · ${events.length} eventi in elenco</p>
        </div>
      </header>
      <div class="list-cards">${cards}</div>
    </div>
  `;
}

export function bindEventListPage(root: HTMLElement, onSelect: (eventId: string) => void): void {
  bindEventMediaImages(root);
  root.querySelectorAll("[data-event-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = (btn as HTMLButtonElement).dataset.eventId;
      if (id) onSelect(id);
    });
  });
}
