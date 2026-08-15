import {
  escapeHtml,
  formatUtilitySyncDate,
  getEditionTerritoryLabel,
  getUtilityServicesForEdition,
  type AtlasUtilityServiceLink,
  type UtilitySyncSnapshot,
} from "@atlas/core";

export { loadUtilitySyncSnapshot } from "./utility-services-data.js";

export function renderPharmacyPanelHtml(snapshot: UtilitySyncSnapshot | null): string {
  const pharmacyService = getUtilityServicesForEdition().find((s) => s.kind === "pharmacy_duty");

  if (snapshot?.pharmacies.items.length) {
    return renderPharmacySection(snapshot, pharmacyService);
  }

  if (pharmacyService) {
    return renderExternalFallback(pharmacyService, "Farmacie di turno non ancora sincronizzate per questa area.");
  }

  return `<p class="utility-services-empty">Farmacie non disponibili per questa area.</p>`;
}

export function renderCinemaPanelHtml(snapshot: UtilitySyncSnapshot | null): string {
  const territory = getEditionTerritoryLabel();
  const cinemaService = getUtilityServicesForEdition().find((s) => s.kind === "cinema_listings");

  if (snapshot?.cinema.items.length) {
    return renderCinemaSection(snapshot, territory, cinemaService);
  }

  if (cinemaService) {
    return renderExternalFallback(
      cinemaService,
      "Programmazione cinema non ancora sincronizzata per questa area.",
    );
  }

  return `<p class="utility-services-empty">Cinema non disponibile per questa area.</p>`;
}

function renderPharmacySection(
  snapshot: UtilitySyncSnapshot,
  external?: AtlasUtilityServiceLink,
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
  const items = snapshot.pharmacies.items.map((pharmacy) => {
    const meta = [pharmacy.municipality, pharmacy.address, pharmacy.phone, pharmacy.hoursToday ? `oggi ${pharmacy.hoursToday}` : ""]
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
  }).join("");

  const sourceUrl = external?.url ?? snapshot.pharmacies.sourceUrl;

  return `
    <div class="utility-services-list">
      <p class="utility-services-lead">
        Turno del <strong>${escapeHtml(dutyLabel)}</strong> in provincia
        (${snapshot.pharmacies.items.length} farmacie) · aggiornato ${escapeHtml(updated)}
      </p>
      <div class="utility-sync-items">${items}</div>
      <a class="utility-sync-source" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">
        Verifica su ${escapeHtml(snapshot.pharmacies.sourceLabel)} ↗
      </a>
    </div>
  `;
}

function renderCinemaSection(
  snapshot: UtilitySyncSnapshot,
  territory: string,
  external?: AtlasUtilityServiceLink,
): string {
  const updated = formatUtilitySyncDate(snapshot.syncedAt);
  const films = snapshot.cinema.items
    .map((film) => {
      const showings = film.showings
        .map((showing) => {
          const label = showing.town ? `${showing.cinema} (${showing.town})` : showing.cinema;
          const times = showing.times.join(", ");
          const inner = `<span class="utility-cinema-venue">${escapeHtml(label)}</span> <span class="utility-cinema-times">${escapeHtml(times)}</span>`;
          if (showing.url) {
            return `<a class="utility-cinema-showing" href="${escapeHtml(showing.url)}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
          }
          return `<div class="utility-cinema-showing">${inner}</div>`;
        })
        .join("");

      const title = film.url
        ? `<a class="utility-sync-item-title utility-cinema-title" href="${escapeHtml(film.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(film.title)}</a>`
        : `<strong class="utility-sync-item-title utility-cinema-title">${escapeHtml(film.title)}</strong>`;

      return `
        <article class="utility-cinema-film">
          ${title}
          <div class="utility-cinema-showings">${showings}</div>
        </article>
      `;
    })
    .join("");

  const sourceUrl = external?.url ?? snapshot.cinema.sourceUrl;

  return `
    <div class="utility-services-list">
      <p class="utility-services-lead">${escapeHtml(territory)} · aggiornato ${escapeHtml(updated)}</p>
      <div class="utility-cinema-films">${films}</div>
      <a class="utility-sync-source" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">
        Programmazione completa su ${escapeHtml(snapshot.cinema.sourceLabel)} ↗
      </a>
    </div>
  `;
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

export function renderUtilityPanelLoadingHtml(): string {
  return `<p class="utility-services-empty">Caricamento…</p>`;
}
