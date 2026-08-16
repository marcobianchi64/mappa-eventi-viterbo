import { initSupabaseClient, fetchEventById } from "@atlas/supabase-client";
import { escapeHtml, formatEventSchedule, getDisplayCategory, getEventDisplayTitle, getEventVenueDisplay, getCategoryMeta, isHttpUrl, linkifyPlainText } from "@atlas/core";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !key) {
  document.body.innerHTML = "<p>Configurazione Supabase mancante.</p>";
} else {
  initSupabaseClient({ url, anonKey: key });
  void boot();
}

async function boot(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") ?? params.get("event");
  const root = document.getElementById("app");

  if (!root) return;

  if (!id) {
    root.innerHTML = `<main class="event-page"><p>Evento non specificato. <a href="./">Torna alla mappa</a></p></main>`;
    return;
  }

  root.innerHTML = "<main class=\"event-page\"><p>Caricamento...</p></main>";

  try {
    const event = await fetchEventById(id);
    if (!event) {
      root.innerHTML = `<main class="event-page"><p>Evento non trovato. <a href="./">Torna alla mappa</a></p></main>`;
      return;
    }

    const meta = getCategoryMeta(getDisplayCategory(event));
    const mapUrl = `./?event=${encodeURIComponent(id)}`;

    const venue = getEventVenueDisplay(event);
    const cover = isHttpUrl(event.image_url)
      ? `<img class="event-page-cover" src="${escapeHtml(event.image_url)}" alt="" />`
      : "";
    const accessBtn = isHttpUrl(event.event_url)
      ? `<a class="btn secondary" href="${escapeHtml(event.event_url!)}" target="_blank" rel="noopener">Accesso</a>`
      : "";

    root.innerHTML = `
      <main class="event-page">
        <p><a href="./">← Torna alla mappa</a></p>
        ${cover}
        <span class="event-page-badge" style="color:${meta.color}">${meta.label}</span>
        <h1>${escapeHtml(getEventDisplayTitle(event))}</h1>
        <p><strong>Quando:</strong> ${escapeHtml(formatEventSchedule(event))}</p>
        ${venue ? `<p><strong>Dove:</strong> ${escapeHtml(venue)}</p>` : ""}
        ${event.description ? `<p>${linkifyPlainText(event.description)}</p>` : ""}
        <p>
          <a class="btn" href="${mapUrl}">Apri sulla mappa</a>
          ${accessBtn}
        </p>
      </main>
    `;

    document.title = `${event.title} — Project Atlas`;
  } catch (error) {
    root.innerHTML = `<main class="event-page"><p>Errore: ${escapeHtml((error as Error).message)}</p></main>`;
  }
}
