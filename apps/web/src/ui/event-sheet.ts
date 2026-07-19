import {
  createEventShareUrl,
  directionsUrl,
  escapeHtml,
  formatDate,
  getDisplayCategory,
  getCategoryMeta,
  type AtlasEvent,
} from "@atlas/core";

export function closeEventSheet(): void {
  document.getElementById("stableEventOverlay")?.classList.remove("open");
  document.getElementById("stableEventSheet")?.classList.remove("open");
}

export function openEventSheet(
  event: AtlasEvent,
  onSaveInterest: (event: AtlasEvent) => void,
  onShare: (title: string, url: string) => void,
  onToast: (message: string) => void,
): void {
  const content = document.getElementById("stableEventContent");
  const overlay = document.getElementById("stableEventOverlay");
  const sheet = document.getElementById("stableEventSheet");
  if (!content || !overlay || !sheet) return;

  const category = getDisplayCategory(event);
  const meta = getCategoryMeta(category);
  const title = escapeHtml(event.title);
  const venue = escapeHtml(event.venue);
  const description = escapeHtml(event.description);
  const imageUrl = event.image_url ? escapeHtml(event.image_url) : "";

  const coverStyle = imageUrl
    ? `background-image: linear-gradient(to top, rgba(0,0,0,.35), transparent 60%), url('${imageUrl}')`
    : "";
  const coverClass = imageUrl ? "" : `${category}-cover`;

  const shareUrl = createEventShareUrl(event, window.location.origin + window.location.pathname);
  const officialAction = event.event_url
    ? `<button class="stable-event-action" data-action="official" type="button"><span>ℹ️</span>Info</button>`
    : `<button class="stable-event-action" data-action="no-official" type="button"><span>ℹ️</span>Info</button>`;

  content.innerHTML = `
    <button class="stable-event-close" type="button" aria-label="Chiudi">×</button>
    <div class="stable-event-cover ${coverClass}" style="${coverStyle}">
      ${imageUrl ? "" : `<div class="stable-event-cover-icon">${meta.icon}</div>`}
      <div class="stable-event-badge" style="color:${meta.color}">${meta.label}</div>
    </div>
    <div class="stable-event-body">
      <h2 class="stable-event-title">${title}</h2>
      <div class="stable-event-facts">
        ${event.start_date ? `<div>📅 ${formatDate(event.start_date)}</div>` : ""}
        ${venue ? `<div>📍 ${venue}</div>` : ""}
      </div>
      <div class="stable-event-section">
        <h3>Informazioni</h3>
        <p>${description || "Informazioni essenziali sull'evento."}</p>
      </div>
      <div class="stable-event-actions">
        <button class="stable-event-action reminder" data-action="save" type="button"><span>🔖</span>Ricorda</button>
        <a class="stable-event-action" href="${directionsUrl(event.lat, event.lng)}" target="_blank" rel="noopener noreferrer"><span>📍</span>Guidami</a>
        <button class="stable-event-action" data-action="share" type="button"><span>📤</span>Condividi</button>
        ${officialAction}
        <button class="stable-event-action" data-action="access" type="button"><span>🎟</span>Accesso</button>
      </div>
    </div>
  `;

  content.querySelector(".stable-event-close")?.addEventListener("click", closeEventSheet);
  content.querySelector('[data-action="save"]')?.addEventListener("click", () => {
    onSaveInterest(event);
    onToast("Evento salvato. Te lo ricorderemo il giorno prima.");
  });
  content.querySelector('[data-action="share"]')?.addEventListener("click", () => {
    onShare(event.title || "Evento", shareUrl);
  });
  content.querySelector('[data-action="official"]')?.addEventListener("click", () => {
    if (event.event_url) window.open(event.event_url, "_blank", "noopener,noreferrer");
  });
  content.querySelector('[data-action="no-official"]')?.addEventListener("click", () => {
    onToast("Nessuna pagina ufficiale indicata");
  });
  content.querySelector('[data-action="access"]')?.addEventListener("click", () => {
    onToast("Accesso e partecipazione saranno gestiti dal modulo futuro");
  });

  overlay.classList.add("open");
  sheet.classList.add("open");
}

export function shareEvent(title: string, url: string): void {
  const text = `Ti invito a vedere questo evento: ${title}`;
  if (navigator.share) {
    navigator.share({ title, text, url }).catch(() => {});
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank");
  }
}
