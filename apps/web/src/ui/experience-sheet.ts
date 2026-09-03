import {
  directionsUrl,
  escapeHtml,
  getCategoryMeta,
  isHttpUrl,
  linkifyPlainText,
  openHttpUrl,
  type AtlasExperience,
} from "@atlas/core";
import { closeEventSheet } from "./event-sheet.js";
import { categoryCoverSeed, renderSheetCategoryCover } from "./category-covers.js";

const REPEATABILITY_LABELS: Record<AtlasExperience["repeatability"], string> = {
  ongoing: "Sempre disponibile",
  seasonal: "Stagionale",
  on_request: "Su richiesta",
};

const PRICE_LABELS: Record<AtlasExperience["price_hint"], string> = {
  free: "Gratuita",
  paid: "A pagamento",
  mixed: "Gratuita e a pagamento",
  unknown: "Prezzo da confermare",
};

/** Scheda esperienza: stesso contenitore stabile degli eventi, senza date. */
export function openExperienceSheet(
  experience: AtlasExperience,
  onToast: (message: string) => void,
): void {
  const content = document.getElementById("stableEventContent");
  const overlay = document.getElementById("stableEventOverlay");
  const sheet = document.getElementById("stableEventSheet");
  if (!content || !overlay || !sheet) return;

  const meta = getCategoryMeta(experience.category);
  const title = escapeHtml(experience.title);
  const description = linkifyPlainText(experience.description ?? "");
  const badge = `<div class="stable-event-badge" style="color:${meta.color}">Esperienza · ${meta.label}</div>`;
  const cover = isHttpUrl(experience.image_url)
    ? `<div class="stable-event-cover"><img src="${escapeHtml(experience.image_url!)}" alt="${title}" referrerpolicy="no-referrer" loading="lazy" onerror="this.remove()">${badge}</div>`
    : renderSheetCategoryCover(experience.category, categoryCoverSeed({ title: experience.title }), badge);

  const hasCoords = Number.isFinite(experience.lat) && Number.isFinite(experience.lng);
  const place = [experience.municipality, experience.address].filter(Boolean).join(" · ");

  content.innerHTML = `
    <button class="stable-event-close" type="button" aria-label="Chiudi">×</button>
    ${cover}
    <div class="stable-event-body">
      <h2 class="stable-event-title">${title}</h2>
      <div class="stable-event-facts">
        <div>♻️ ${escapeHtml(REPEATABILITY_LABELS[experience.repeatability])}</div>
        <div>💶 ${escapeHtml(PRICE_LABELS[experience.price_hint])}</div>
        ${place ? `<div>📍 ${escapeHtml(place)}</div>` : ""}
      </div>
      <div class="stable-event-section">
        <h3>Informazioni</h3>
        <p>${description || "Esperienza del territorio: contatta il referente per i dettagli."}</p>
      </div>
      <div class="stable-event-actions">
        ${hasCoords ? `<button class="stable-event-action" data-action="directions" type="button"><span>📍</span>Guidami</button>` : ""}
        <button class="stable-event-action" data-action="info" type="button"><span>ℹ️</span>Info</button>
      </div>
    </div>
  `;

  content.querySelector(".stable-event-close")?.addEventListener("click", closeEventSheet);
  content.querySelector('[data-action="directions"]')?.addEventListener("click", () => {
    openHttpUrl(directionsUrl(experience.lat!, experience.lng!));
  });
  content.querySelector('[data-action="info"]')?.addEventListener("click", () => {
    if (!openHttpUrl(experience.info_url)) {
      onToast("Nessuna pagina informativa indicata per questa esperienza.");
    }
  });

  overlay.classList.add("open");
  sheet.classList.add("open");
  document.body.classList.add("atlas-event-sheet-open");
}
