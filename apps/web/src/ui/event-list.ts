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
  type AtlasExperience,
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

const EXPERIENCE_AVAILABILITY_LABELS: Record<AtlasExperience["repeatability"], string> = {
  ongoing: "Sempre disponibile",
  seasonal: "Stagionale",
  on_request: "Su richiesta",
};

const EXPERIENCE_PRICE_LABELS: Record<AtlasExperience["price_hint"], string> = {
  free: "Gratuita",
  paid: "A pagamento",
  mixed: "Gratuita e a pagamento",
  unknown: "Prezzo da confermare",
};

/** Sezione esperienze in coda all'elenco: mai mischiata all'ordinamento per data. */
function renderExperienceListSection(experiences: AtlasExperience[]): string {
  if (experiences.length === 0) return "";
  const cards = experiences
    .map((experience) => {
      const meta = getCategoryMeta(experience.category);
      const desc = escapeHtml(excerpt(experience.description));
      return `
        <article class="list-card list-card--experience">
          <button type="button" class="list-card-hit" data-experience-id="${escapeHtml(experience.id)}">
            <div class="list-card-body">
              <h2 class="list-card-title">${escapeHtml(experience.title)}</h2>
              <p class="list-card-excerpt">${desc}</p>
              <div class="list-card-meta">
                <span class="list-card-meta-item">♻️ ${escapeHtml(EXPERIENCE_AVAILABILITY_LABELS[experience.repeatability])}</span>
                <span class="list-card-meta-item">💶 ${escapeHtml(EXPERIENCE_PRICE_LABELS[experience.price_hint])}</span>
                <span class="list-card-meta-item list-card-meta-category" style="color:${meta.color}">🏷 ${escapeHtml(meta.label)}</span>
                ${experience.municipality ? `<span class="list-card-meta-item list-card-meta-place">📍 ${escapeHtml(experience.municipality)}</span>` : ""}
              </div>
            </div>
          </button>
        </article>
      `;
    })
    .join("");

  return `
    <section class="list-experiences" aria-label="Esperienze del territorio">
      <header class="list-experiences-header">
        <h2>Esperienze da vivere tutto l'anno</h2>
        <p class="list-experiences-lead"><strong>${experiences.length}</strong> proposte senza vincolo di data: prenota quando vuoi.</p>
      </header>
      <div class="list-cards">${cards}</div>
    </section>
  `;
}

export function renderEventListPageHtml(
  events: AtlasEvent[],
  activeCategory: EventListCategoryFilter,
  activeRange: DateRangeKey,
  experiences: AtlasExperience[] = [],
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
        </div>
        <p class="list-page-stat" aria-live="polite"><strong>${events.length}</strong> eventi trovati</p>
        <p class="list-page-lead">${summary} · aggiornato ogni giorno da più fonti locali</p>
      </header>
      <div class="list-cards">${cards}</div>
      ${renderExperienceListSection(experiences)}
    </div>
  `;
}

export function bindEventListPage(
  root: HTMLElement,
  onSelect: (eventId: string) => void,
  onSelectExperience?: (experienceId: string) => void,
): void {
  bindEventMediaImages(root);
  root.querySelectorAll("[data-event-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = (btn as HTMLButtonElement).dataset.eventId;
      if (id) onSelect(id);
    });
  });
  root.querySelectorAll("[data-experience-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = (btn as HTMLButtonElement).dataset.experienceId;
      if (id) onSelectExperience?.(id);
    });
  });
}
