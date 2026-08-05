import { escapeHtml, getUtilityServicesForEdition, type AtlasUtilityServiceLink } from "@atlas/core";

export function renderUtilityServicesPanelHtml(): string {
  const services = getUtilityServicesForEdition();
  if (services.length === 0) {
    return `<p class="utility-services-empty">Servizi in arrivo per questa area.</p>`;
  }

  const items = services.map((service) => renderUtilityServiceItem(service)).join("");
  return `<div class="utility-services-list">${items}</div>`;
}

function renderUtilityServiceItem(service: AtlasUtilityServiceLink): string {
  const modeHint =
    service.mode === "external_link_sync_planned"
      ? `<span class="utility-service-badge">Sync Atlas in arrivo</span>`
      : service.mode === "atlas_sync_planned"
        ? `<span class="utility-service-badge">Prossimamente in app</span>`
        : "";

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
        ${modeHint}
      </span>
      <span class="utility-service-arrow" aria-hidden="true">↗</span>
    </a>
  `;
}
