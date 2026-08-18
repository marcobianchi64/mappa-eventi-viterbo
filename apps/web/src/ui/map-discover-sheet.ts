import {
  DATE_RANGE_LABELS,
  escapeHtml,
  formatEventSchedule,
  getDisplayCategory,
  getEditionTerritoryLabel,
  getEventComuneDisplayLabel,
  getEventDisplayTitle,
  getCategoryMeta,
  type AtlasEvent,
  type AtlasExperience,
  type DateRangeKey,
} from "@atlas/core";
import { renderListCardMedia } from "./event-media.js";

export type MapDiscoverSheetState = "collapsed" | "peek" | "expanded";

const SHEET_STATES: MapDiscoverSheetState[] = ["collapsed", "peek", "expanded"];

export function renderMapDiscoverSheetHtml(
  events: AtlasEvent[],
  activeRange: DateRangeKey,
  totalCount: number,
  experiences: AtlasExperience[] = [],
): string {
  const period = escapeHtml(DATE_RANGE_LABELS[activeRange] ?? activeRange);
  const territory = escapeHtml(getEditionTerritoryLabel());
  const preview = events.slice(0, 12);

  const cards =
    preview.length === 0
      ? `<p class="map-discover-empty">Nessun evento nel periodo selezionato. Prova <strong>Filtra</strong> per allargare la ricerca.</p>`
      : preview
          .map((event) => {
            const id = escapeHtml(String(event.date_event ?? ""));
            const title = escapeHtml(getEventDisplayTitle(event));
            const when = escapeHtml(formatEventSchedule(event));
            const place = escapeHtml(getEventComuneDisplayLabel(event) || event.venue || "");
            const category = getDisplayCategory(event);
            const meta = getCategoryMeta(category);
            return `
              <button type="button" class="map-discover-card" data-event-id="${id}">
                <div class="map-discover-card-media">${renderListCardMedia(event)}</div>
                <div class="map-discover-card-body">
                  <span class="map-discover-card-tag" style="color:${meta.color}">${escapeHtml(meta.label)}</span>
                  <strong class="map-discover-card-title">${title}</strong>
                  <span class="map-discover-card-meta">📅 ${when}${place ? ` · ${place}` : ""}</span>
                </div>
              </button>
            `;
          })
          .join("");

  return `
    <div class="map-discover-handle" id="mapDiscoverHandle" role="button" tabindex="0" aria-label="Espandi o riduci pannello eventi"></div>
    <header class="map-discover-header">
      <div>
        <h2 class="map-discover-title">Scopri cosa fare</h2>
        <p class="map-discover-sub">${territory}</p>
      </div>
      <p class="map-discover-count" aria-live="polite"><strong>${totalCount}</strong> eventi · ${period}</p>
    </header>
    <div class="map-discover-rail" id="mapDiscoverRail">${cards}</div>
    ${renderExperienceRail(experiences)}
    <button type="button" class="map-discover-cta" id="mapDiscoverListBtn">Vedi tutti in elenco →</button>
  `;
}

function renderExperienceRail(experiences: AtlasExperience[]): string {
  if (experiences.length === 0) return "";
  const cards = experiences
    .slice(0, 12)
    .map((experience) => {
      const meta = getCategoryMeta(experience.category);
      const availability =
        experience.repeatability === "seasonal"
          ? "Stagionale"
          : experience.repeatability === "on_request"
            ? "Su richiesta"
            : "Sempre disponibile";
      return `
        <button type="button" class="map-discover-card map-discover-card--experience" data-experience-id="${escapeHtml(experience.id)}">
          <div class="map-discover-card-body">
            <span class="map-discover-card-tag" style="color:${meta.color}">${escapeHtml(meta.label)}</span>
            <strong class="map-discover-card-title">${escapeHtml(experience.title)}</strong>
            <span class="map-discover-card-meta">♻️ ${escapeHtml(availability)}${experience.municipality ? ` · ${escapeHtml(experience.municipality)}` : ""}</span>
          </div>
        </button>
      `;
    })
    .join("");

  return `
    <p class="map-discover-experiences-heading"><strong>${experiences.length}</strong> esperienze da vivere tutto l'anno</p>
    <div class="map-discover-rail map-discover-rail--experiences" id="mapDiscoverExperienceRail">${cards}</div>
  `;
}

export function applyMapDiscoverSheetState(
  sheet: HTMLElement,
  state: MapDiscoverSheetState,
): MapDiscoverSheetState {
  for (const value of SHEET_STATES) {
    sheet.classList.toggle(`is-${value}`, value === state);
  }
  sheet.dataset.state = state;
  return state;
}

export function cycleMapDiscoverSheetState(current: MapDiscoverSheetState): MapDiscoverSheetState {
  const index = SHEET_STATES.indexOf(current);
  return SHEET_STATES[(index + 1) % SHEET_STATES.length] ?? "peek";
}

export function bindMapDiscoverSheet(
  sheet: HTMLElement,
  options: {
    onSelectEvent: (eventId: string) => void;
    onSelectExperience?: (experienceId: string) => void;
    onOpenList: () => void;
    onStateChange?: (state: MapDiscoverSheetState) => void;
  },
): void {
  let state = (sheet.dataset.state as MapDiscoverSheetState) || "peek";
  applyMapDiscoverSheetState(sheet, state);

  const setState = (next: MapDiscoverSheetState): void => {
    state = applyMapDiscoverSheetState(sheet, next);
    options.onStateChange?.(state);
  };

  if (sheet.dataset.bound !== "1") {
    sheet.dataset.bound = "1";

    sheet.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      if (target.closest("#mapDiscoverHandle")) {
        const current = (sheet.dataset.state as MapDiscoverSheetState) || "peek";
        setState(cycleMapDiscoverSheetState(current));
        return;
      }
      if (target.closest("#mapDiscoverListBtn")) {
        options.onOpenList();
        return;
      }
      const experienceCard = target.closest<HTMLElement>("[data-experience-id]");
      if (experienceCard?.dataset.experienceId) {
        options.onSelectExperience?.(experienceCard.dataset.experienceId);
        return;
      }
      const card = target.closest<HTMLElement>("[data-event-id]");
      if (card?.dataset.eventId) {
        options.onSelectEvent(card.dataset.eventId);
      }
    });
  }
}
