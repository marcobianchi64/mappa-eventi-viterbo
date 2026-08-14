import {
  ATLAS_EDITION,
  escapeHtml,
  formatUtilitySyncDate,
  getUtilityServicesForEdition,
  utilitySyncDataUrl,
  type AtlasUtilityServiceLink,
  type UtilitySyncSnapshot,
} from "@atlas/core";

export async function loadUtilitySyncSnapshot(
  editionId: string = ATLAS_EDITION.id,
): Promise<UtilitySyncSnapshot | null> {
  try {
    const response = await fetch(utilitySyncDataUrl(editionId), { cache: "no-cache" });
    if (!response.ok) return null;
    return (await response.json()) as UtilitySyncSnapshot;
  } catch {
    return null;
  }
}

export function renderUtilityServicesPanelHtml(snapshot: UtilitySyncSnapshot | null): string {
  const services = getUtilityServicesForEdition();
  const sections: string[] = [];

  const pharmacyService = services.find((s) => s.kind === "pharmacy_duty");
  const cinemaService = services.find((s) => s.kind === "cinema_listings");
  const bookingServices = services.filter((s) => s.kind === "cinema_booking");

  if (snapshot?.pharmacies.items.length) {
    sections.push(renderPharmacySection(snapshot, pharmacyService));
  } else if (pharmacyService) {
    sections.push(renderExternalServiceItem(pharmacyService));
  }

  if (snapshot?.cinema.items.length) {
    sections.push(renderCinemaSection(snapshot, cinemaService));
  } else if (cinemaService) {
    sections.push(renderExternalServiceItem(cinemaService));
  }

  for (const service of bookingServices) {
    sections.push(renderExternalServiceItem(service));
  }

  if (sections.length === 0) {
    return `<p class="utility-services-empty">Servizi in arrivo per questa area.</p>`;
  }

  return `<div class="utility-services-list">${sections.join("")}</div>`;
}

function renderPharmacySection(
  snapshot: UtilitySyncSnapshot,
  external?: AtlasUtilityServiceLink,
): string {
  const updated = formatUtilitySyncDate(snapshot.syncedAt);
  const items = snapshot.pharmacies.items
    .slice(0, 12)
    .map((pharmacy) => {
      const meta = [pharmacy.address, pharmacy.phone].filter(Boolean).join(" · ");
      const inner = `
        <strong class="utility-sync-item-title">${escapeHtml(pharmacy.name)}</strong>
        ${meta ? `<span class="utility-sync-item-meta">${escapeHtml(meta)}</span>` : ""}
      `;
      if (pharmacy.url) {
        return `<a class="utility-sync-item" href="${escapeHtml(pharmacy.url)}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
      }
      return `<div class="utility-sync-item">${inner}</div>`;
    })
    .join("");

  const more =
    snapshot.pharmacies.items.length > 12
      ? `<p class="utility-sync-more">+ altre ${snapshot.pharmacies.items.length - 12} farmacie</p>`
      : "";

  const sourceUrl = external?.url ?? snapshot.pharmacies.sourceUrl;

  return `
    <section class="utility-sync-section">
      <div class="utility-sync-header">
        <span class="utility-sync-icon" aria-hidden="true">💊</span>
        <div>
          <h4 class="utility-sync-title">Farmacie di turno</h4>
          <p class="utility-sync-lead">Provincia di Viterbo · aggiornato ${escapeHtml(updated)}</p>
        </div>
      </div>
      <div class="utility-sync-items">${items}</div>
      ${more}
      <a class="utility-sync-source" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">
        Vedi tutte su ${escapeHtml(snapshot.pharmacies.sourceLabel)} ↗
      </a>
    </section>
  `;
}

function renderCinemaSection(
  snapshot: UtilitySyncSnapshot,
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
    <section class="utility-sync-section">
      <div class="utility-sync-header">
        <span class="utility-sync-icon" aria-hidden="true">🎬</span>
        <div>
          <h4 class="utility-sync-title">Programmazione cinema</h4>
          <p class="utility-sync-lead">Provincia di Viterbo · aggiornato ${escapeHtml(updated)}</p>
        </div>
      </div>
      <div class="utility-cinema-films">${films}</div>
      <a class="utility-sync-source" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">
        Programmazione completa su ${escapeHtml(snapshot.cinema.sourceLabel)} ↗
      </a>
    </section>
  `;
}

function renderExternalServiceItem(service: AtlasUtilityServiceLink): string {
  return `
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
  `;
}

export function renderUtilityServicesLoadingHtml(): string {
  return `<p class="utility-services-empty">Caricamento servizi…</p>`;
}
