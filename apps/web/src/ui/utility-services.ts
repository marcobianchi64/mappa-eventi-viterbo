import {
  buildCinemaVenues,
  escapeHtml,
  filterCinemaFilms,
  filterCinemaVenues,
  filterPharmacies,
  formatUtilitySyncDate,
  getUtilityServicesForEdition,
  listCinemaTowns,
  mergeCinemaVenuesWithRegistry,
  type AtlasUtilityServiceLink,
  type CinemaViewMode,
  type PharmacyShiftFilter,
  type UtilityCinemaVenue,
  type UtilitySyncSnapshot,
} from "@atlas/core";

export { loadUtilitySyncSnapshot } from "./utility-services-data.js";

export function renderUtilityPanelLoadingHtml(): string {
  return `<p class="utility-services-empty">Caricamento…</p>`;
}

export function mountPharmacyPanel(
  container: HTMLElement,
  snapshot: UtilitySyncSnapshot | null,
): void {
  if (!snapshot?.pharmacies.items.length) {
    const service = getUtilityServicesForEdition().find((s) => s.kind === "pharmacy_duty");
    container.innerHTML = service
      ? renderExternalFallback(service, "Farmacie di turno non ancora sincronizzate per questa area.")
      : `<p class="utility-services-empty">Farmacie non disponibili per questa area.</p>`;
    return;
  }

  const state = { shift: "all" as PharmacyShiftFilter, query: "" };
  const service = getUtilityServicesForEdition().find((s) => s.kind === "pharmacy_duty");
  const consult = snapshot.pharmacies.consult ?? {
    all: service?.url ?? snapshot.pharmacies.sourceUrl,
  };

  const render = (): void => {
    const filtered = filterPharmacies(snapshot.pharmacies.items, state);
    container.innerHTML = renderPharmacyPanelContent(snapshot, filtered, state, consult);
    bindPharmacyPanel(container, state, render);
  };

  render();
}

export function mountCinemaPanel(container: HTMLElement, snapshot: UtilitySyncSnapshot | null): void {
  if (!snapshot) {
    const service = getUtilityServicesForEdition().find((s) => s.kind === "cinema_listings");
    container.innerHTML = service
      ? renderExternalFallback(
          service,
          "Programmazione cinema non ancora sincronizzata per questa area.",
        )
      : `<p class="utility-services-empty">Cinema non disponibile per questa area.</p>`;
    return;
  }

  const syncedVenues = snapshot.cinema.venues ?? buildCinemaVenues(snapshot.cinema.items);
  const venues = mergeCinemaVenuesWithRegistry(syncedVenues);
  const state = { mode: "cinemas" as CinemaViewMode, query: "" };

  const render = (): void => {
    container.innerHTML = renderCinemaPanelContent(snapshot, venues, state);
    bindCinemaPanel(container, state, render);
  };

  render();
}

function renderCinemaVenueCard(venue: UtilityCinemaVenue): string {
  const label = venue.town ? `${venue.cinema} (${venue.town})` : venue.cinema;
  const hasShowtimes = venue.films.length > 0;
  const statusInline = hasShowtimes
    ? ""
    : `<span class="utility-cinema-no-program">· Nessuna programmazione oggi</span>`;
  const titleInner = `${escapeHtml(label)}${statusInline}`;
  const header = venue.url
    ? `<a class="utility-cinema-venue-title" href="${escapeHtml(venue.url)}" target="_blank" rel="noopener noreferrer">${titleInner}</a>`
    : `<strong class="utility-cinema-venue-title">${titleInner}</strong>`;

  const body = hasShowtimes
    ? `<div class="utility-cinema-venue-films">${venue.films
        .map((film) => {
          const title = film.url
            ? `<a class="utility-cinema-film-link" href="${escapeHtml(film.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(film.title)}</a>`
            : `<span class="utility-cinema-film-link">${escapeHtml(film.title)}</span>`;
          return `<div class="utility-cinema-venue-film">${title} <span class="utility-cinema-times">${escapeHtml(film.times.join(", "))}</span></div>`;
        })
        .join("")}</div>`
    : "";

  return `<article class="utility-cinema-venue-card">${header}${body}</article>`;
}

function renderPharmacyPanelContent(
  snapshot: UtilitySyncSnapshot,
  items: ReturnType<typeof filterPharmacies>,
  state: { shift: PharmacyShiftFilter; query: string },
  consult: { all: string; map?: string },
): string {
  const updated = formatUtilitySyncDate(snapshot.syncedAt);
  const dutyDate = snapshot.pharmacies.dutyDate;
  const dutyLabel = dutyDate
    ? new Date(`${dutyDate}T12:00:00`).toLocaleDateString("it-IT", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "oggi";

  const shiftButtons = (["all", "day", "night", "h24"] as const)
    .map((shift) => {
      const labels = { all: "Tutte", day: "Diurno", night: "Notturno", h24: "H24" };
      return `<button type="button" class="utility-chip${state.shift === shift ? " active" : ""}" data-pharmacy-shift="${shift}">${labels[shift]}</button>`;
    })
    .join("");

  const list =
    items.length === 0
      ? `<p class="utility-services-empty">Nessuna farmacia per questo filtro. Prova un altro turno o cerca un comune.</p>`
      : `<div class="utility-sync-items">${items
          .map((pharmacy) => {
            const meta = [
              pharmacy.municipality,
              pharmacy.address,
              pharmacy.phone,
              pharmacy.hoursToday ? `oggi ${pharmacy.hoursToday}` : "",
            ]
              .filter(Boolean)
              .join(" · ");
            const inner = `
              <strong class="utility-sync-item-title">${escapeHtml(pharmacy.name)}</strong>
              ${meta ? `<span class="utility-sync-item-meta">${escapeHtml(meta)}</span>` : ""}
            `;
            if (pharmacy.url) {
              return `<a class="utility-sync-item" href="${escapeHtml(pharmacy.url)}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
            }
            return `<div class="utility-sync-item">${inner}</div>`;
          })
          .join("")}</div>`;

  const consultLinks = [
    `<a class="utility-sync-source" href="${escapeHtml(consult.all)}" target="_blank" rel="noopener noreferrer">Consulta tutte le opzioni su Pagine Gialle ↗</a>`,
    consult.map
      ? `<a class="utility-sync-source utility-sync-source-secondary" href="${escapeHtml(consult.map)}" target="_blank" rel="noopener noreferrer">Mappa farmacie di turno ↗</a>`
      : "",
  ].join("");

  return `
    <div class="utility-services-list" data-utility-panel="pharmacy">
      <div class="utility-panel-sticky">
        <p class="utility-services-lead">
          Turno del <strong>${escapeHtml(dutyLabel)}</strong> · ${items.length} risultati
          · aggiornato ${escapeHtml(updated)}
        </p>
        <div class="utility-panel-toolbar">
          <div class="utility-chip-row" role="group" aria-label="Fascia oraria">${shiftButtons}</div>
          <label class="utility-search">
            <span class="utility-search-label">Cerca comune o farmacia</span>
            <input type="search" class="utility-search-input" data-pharmacy-search placeholder="Es. Viterbo, Montefiascone…" value="${escapeHtml(state.query)}" />
          </label>
        </div>
      </div>
      <div class="utility-panel-scroll-body" tabindex="0" aria-label="Elenco farmacie">
        ${list}
        <div class="utility-consult-links">${consultLinks}</div>
      </div>
    </div>
  `;
}

function renderCinemaPanelContent(
  snapshot: UtilitySyncSnapshot,
  venues: UtilityCinemaVenue[],
  state: { mode: CinemaViewMode; query: string },
): string {
  const updated = formatUtilitySyncDate(snapshot.syncedAt);
  const service = getUtilityServicesForEdition().find((s) => s.kind === "cinema_listings");
  const sourceUrl = service?.url ?? snapshot.cinema.sourceUrl;
  const townChips = [
    `<button type="button" class="utility-chip utility-chip-town${state.query ? "" : " active"}" data-cinema-town="">Tutte</button>`,
    ...listCinemaTowns(venues).map(
      (town) =>
        `<button type="button" class="utility-chip utility-chip-town${state.query === town ? " active" : ""}" data-cinema-town="${escapeHtml(town)}">${escapeHtml(town)}</button>`,
    ),
  ].join("");

  const modeButtons = `
    <button type="button" class="utility-chip${state.mode === "cinemas" ? " active" : ""}" data-cinema-mode="cinemas">Per cinema</button>
    <button type="button" class="utility-chip${state.mode === "films" ? " active" : ""}" data-cinema-mode="films">Per film</button>
  `;

  let body = "";
  if (state.mode === "cinemas") {
    const filteredVenues = filterCinemaVenues(venues, state.query);
    body =
      filteredVenues.length === 0
        ? `<p class="utility-services-empty">Nessun cinema trovato. Prova un altro comune o apri MYmovies.</p>`
        : `<div class="utility-cinema-venues">${filteredVenues.map((venue) => renderCinemaVenueCard(venue)).join("")}</div>`;
  } else {
    const filteredFilms = filterCinemaFilms(snapshot.cinema.items, state.query);
    body =
      filteredFilms.length === 0
        ? `<p class="utility-services-empty">Nessun film trovato per questa ricerca.</p>`
        : `<div class="utility-cinema-films">${filteredFilms
            .map((film) => {
              const showings = film.showings
                .map((showing) => {
                  const label = showing.town ? `${showing.cinema} (${showing.town})` : showing.cinema;
                  const inner = `<span class="utility-cinema-venue">${escapeHtml(label)}</span> <span class="utility-cinema-times">${escapeHtml(showing.times.join(", "))}</span>`;
                  if (showing.url) {
                    return `<a class="utility-cinema-showing" href="${escapeHtml(showing.url)}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
                  }
                  return `<div class="utility-cinema-showing">${inner}</div>`;
                })
                .join("");
              const title = film.url
                ? `<a class="utility-sync-item-title utility-cinema-title" href="${escapeHtml(film.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(film.title)}</a>`
                : `<strong class="utility-sync-item-title utility-cinema-title">${escapeHtml(film.title)}</strong>`;
              return `<article class="utility-cinema-film">${title}<div class="utility-cinema-showings">${showings}</div></article>`;
            })
            .join("")}</div>`;
  }

  return `
    <div class="utility-services-list" data-utility-panel="cinema">
      <div class="utility-panel-sticky">
        <p class="utility-services-lead">
          ${venues.length} sale in provincia · aggiornato ${escapeHtml(updated)}
        </p>
        <div class="utility-panel-toolbar">
          <div class="utility-chip-row" role="group" aria-label="Vista cinema">${modeButtons}</div>
          <label class="utility-search">
            <span class="utility-search-label">${state.mode === "cinemas" ? "Cerca cinema o comune" : "Cerca film o sala"}</span>
            <input type="search" class="utility-search-input" data-cinema-search placeholder="${state.mode === "cinemas" ? "Es. Moderno, Bolsena, Gallery…" : "Es. Odissea, Spider-Man…"}" value="${escapeHtml(state.query)}" />
          </label>
          ${state.mode === "cinemas" && townChips ? `<div class="utility-chip-row utility-chip-row-wrap" role="group" aria-label="Comuni e filtri">${townChips}</div>` : ""}
        </div>
      </div>
      <div class="utility-panel-scroll-body" tabindex="0" aria-label="Elenco cinema">
        ${body}
        <a class="utility-sync-source" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">
          Programmazione completa su ${escapeHtml(snapshot.cinema.sourceLabel)} ↗
        </a>
      </div>
    </div>
  `;
}

function bindPharmacyPanel(
  container: HTMLElement,
  state: { shift: PharmacyShiftFilter; query: string },
  render: () => void,
): void {
  container.querySelectorAll("[data-pharmacy-shift]").forEach((button) => {
    button.addEventListener("click", () => {
      state.shift = (button as HTMLButtonElement).dataset.pharmacyShift as PharmacyShiftFilter;
      render();
    });
  });

  const search = container.querySelector<HTMLInputElement>("[data-pharmacy-search]");
  search?.addEventListener("input", () => {
    state.query = search.value;
    render();
  });
}

function bindCinemaPanel(
  container: HTMLElement,
  state: { mode: CinemaViewMode; query: string },
  render: () => void,
): void {
  container.querySelectorAll("[data-cinema-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = (button as HTMLButtonElement).dataset.cinemaMode as CinemaViewMode;
      state.query = "";
      render();
    });
  });

  const search = container.querySelector<HTMLInputElement>("[data-cinema-search]");
  search?.addEventListener("input", () => {
    state.query = search.value;
    render();
  });

  container.querySelectorAll("[data-cinema-town]").forEach((button) => {
    button.addEventListener("click", () => {
      state.query = (button as HTMLButtonElement).dataset.cinemaTown ?? "";
      render();
    });
  });
}

function renderExternalFallback(service: AtlasUtilityServiceLink, message: string): string {
  return `
    <div class="utility-services-list">
      <p class="utility-services-lead">${escapeHtml(message)}</p>
      <a
        class="utility-service-item"
        href="${escapeHtml(service.url)}"
        target="_blank"
        rel="noopener noreferrer"
        data-utility-id="${escapeHtml(service.id)}"
      >
        <span class="utility-service-icon" aria-hidden="true">${service.icon}</span>
        <span class="utility-service-copy">
          <strong class="utility-service-label">${escapeHtml(service.label)}</strong>
          <span class="utility-service-desc">${escapeHtml(service.description)}</span>
          <span class="utility-service-provider">${escapeHtml(service.provider)}</span>
        </span>
        <span class="utility-service-arrow" aria-hidden="true">↗</span>
      </a>
    </div>
  `;
}
