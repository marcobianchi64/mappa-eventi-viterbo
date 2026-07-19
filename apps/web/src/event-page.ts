import { initSupabaseClient, fetchEventById } from "@atlas/supabase-client";
import { escapeHtml, formatDate, getDisplayCategory, getCategoryMeta } from "@atlas/core";

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

    root.innerHTML = `
      <main class="event-page">
        <p><a href="./">← Torna alla mappa</a></p>
        ${event.image_url ? `<img class="event-page-cover" src="${escapeHtml(event.image_url)}" alt="" />` : ""}
        <span class="event-page-badge" style="color:${meta.color}">${meta.label}</span>
        <h1>${escapeHtml(event.title)}</h1>
        <p><strong>Quando:</strong> ${formatDate(event.start_date)}${event.end_date ? ` — ${formatDate(event.end_date)}` : ""}</p>
        ${event.venue ? `<p><strong>Dove:</strong> ${escapeHtml(event.venue)}</p>` : ""}
        ${event.description ? `<p>${escapeHtml(event.description)}</p>` : ""}
        <p>
          <a class="btn" href="${mapUrl}">Apri sulla mappa</a>
          ${event.event_url ? `<a class="btn secondary" href="${escapeHtml(event.event_url)}" target="_blank" rel="noopener">Accesso</a>` : ""}
        </p>
      </main>
    `;

    document.title = `${event.title} — Project Atlas`;
  } catch (error) {
    root.innerHTML = `<main class="event-page"><p>Errore: ${escapeHtml((error as Error).message)}</p></main>`;
  }
}
