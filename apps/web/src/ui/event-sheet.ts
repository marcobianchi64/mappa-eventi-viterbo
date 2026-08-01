import {
  assessEventLocation,
  createEventShareUrl,
  directionsUrl,
  escapeHtml,
  formatEventSchedule,
  getDisplayCategory,
  getEventDisplayTitle,
  getFestivalAppointmentLabel,
  getCategoryMeta,
  isHttpUrl,
  openHttpUrl,
  type AtlasEvent,
  type FestivalMapGroup,
} from "@atlas/core";

let onCloseCallback: (() => void) | null = null;

export function setEventSheetOnClose(callback: (() => void) | null): void {
  onCloseCallback = callback;
}

export function closeEventSheet(): void {
  document.getElementById("stableEventOverlay")?.classList.remove("open");
  document.getElementById("stableEventSheet")?.classList.remove("open");
  onCloseCallback?.();
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
  const title = escapeHtml(getEventDisplayTitle(event));
  const location = assessEventLocation(event);
  const venue = escapeHtml(location.placeLabel);
  const description = escapeHtml(event.description);
  const imageUrl = isHttpUrl(event.image_url) ? escapeHtml(event.image_url) : "";

  const locationNotice =
    location.warnings.length > 0
      ? `<p class="stable-event-location-notice" role="status">${escapeHtml(location.warnings[0])}</p>`
      : "";

  const directionsAction = location.allowDirections
    ? `<button class="stable-event-action" data-action="directions" type="button"><span>📍</span>Guidami</button>`
    : `<button class="stable-event-action" data-action="no-directions" type="button" title="Posizione non verificata con sufficiente certezza"><span>📍</span>Guidami</button>`;

  const coverStyle = imageUrl
    ? `background-image: linear-gradient(to top, rgba(0,0,0,.35), transparent 60%), url('${imageUrl}')`
    : "";
  const coverClass = imageUrl ? "" : `${category}-cover`;

  const shareUrl = createEventShareUrl(event, window.location.origin + window.location.pathname);
  const hasOfficialUrl = isHttpUrl(event.event_url);
  const officialAction = hasOfficialUrl
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
        ${event.start_date ? `<div>📅 ${escapeHtml(formatEventSchedule(event))}</div>` : ""}
        ${venue ? `<div>📍 ${venue}</div>` : ""}
        ${locationNotice}
      </div>
      <div class="stable-event-section">
        <h3>Informazioni</h3>
        <p>${description || "Informazioni essenziali sull'evento."}</p>
      </div>
      <div class="stable-event-actions">
        <button class="stable-event-action reminder" data-action="save" type="button"><span>🔖</span>Ricorda</button>
        ${directionsAction}
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
  content.querySelector('[data-action="directions"]')?.addEventListener("click", () => {
    openHttpUrl(directionsUrl(location.lat, location.lng));
  });
  content.querySelector('[data-action="no-directions"]')?.addEventListener("click", () => {
    onToast(
      location.warnings[0] ??
        "Indicazioni stradali non disponibili: verifica il luogo con l'organizzatore dell'evento.",
    );
  });
  content.querySelector('[data-action="official"]')?.addEventListener("click", () => {
    if (!openHttpUrl(event.event_url)) {
      onToast("Link ufficiale non valido o assente.");
    }
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

export function openFestivalEventSheet(
  group: FestivalMapGroup,
  onOpenEvent: (event: AtlasEvent) => void,
  onToast: (message: string) => void,
): void {
  const content = document.getElementById("stableEventContent");
  const overlay = document.getElementById("stableEventOverlay");
  const sheet = document.getElementById("stableEventSheet");
  if (!content || !overlay || !sheet) return;

  const anchor = group.events[0];
  const category = getDisplayCategory(anchor);
  const meta = getCategoryMeta(category);
  const title = escapeHtml(group.label);
  const location = assessEventLocation(anchor);
  const venue = escapeHtml(location.placeLabel);

  const items = group.events
    .map((event) => {
      const eventTitle = escapeHtml(getFestivalAppointmentLabel(event));
      const schedule = escapeHtml(formatEventSchedule(event));
      const id = escapeHtml(String(event.date_event ?? ""));
      return `<button type="button" class="stable-festival-item" data-event-id="${id}">
        <span class="stable-festival-item-title">${eventTitle}</span>
        <span class="stable-festival-item-date">${schedule}</span>
      </button>`;
    })
    .join("");

  content.innerHTML = `
    <button class="stable-event-close" type="button" aria-label="Chiudi">×</button>
    <div class="stable-event-cover ${category}-cover">
      <div class="stable-event-cover-icon">${meta.icon}</div>
      <div class="stable-event-badge" style="color:${meta.color}">${meta.label}</div>
    </div>
    <div class="stable-event-body">
      <h2 class="stable-event-title">${title}</h2>
      <div class="stable-event-facts">
        <div>📅 ${group.events.length} appuntamenti nel programma</div>
        ${venue ? `<div>📍 ${venue}</div>` : ""}
      </div>
      <div class="stable-event-section">
        <h3>Programma</h3>
        <div class="stable-festival-list" role="list">${items}</div>
      </div>
      <div class="stable-event-actions">
        <button class="stable-event-action" data-action="festival-info" type="button"><span>ℹ️</span>Pagina ufficiale</button>
      </div>
    </div>
  `;

  content.querySelector(".stable-event-close")?.addEventListener("click", closeEventSheet);
  content.querySelectorAll<HTMLButtonElement>(".stable-festival-item").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.eventId;
      const event = group.events.find((e) => String(e.date_event) === id);
      if (event) onOpenEvent(event);
    });
  });
  content.querySelector('[data-action="festival-info"]')?.addEventListener("click", () => {
    const url = group.events.find((e) => isHttpUrl(e.event_url))?.event_url;
    if (!openHttpUrl(url)) onToast("Nessuna pagina ufficiale indicata per questa manifestazione.");
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
