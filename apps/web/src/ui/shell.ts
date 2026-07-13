import {
  ATLAS_VERSION,
  DEFAULT_DATE_RANGE,
  DATE_RANGE_LABELS,
  type DateRangeKey,
} from "@atlas/core";

export function renderShell(): string {
  const rangeLabel = DATE_RANGE_LABELS[DEFAULT_DATE_RANGE] ?? "15 giorni";

  return `
    <div class="atlas-version-check">v${ATLAS_VERSION}</div>

    <div class="topbar">
      <div class="brand-pill">Project Atlas</div>
      <button id="whenButton" class="chip primary" type="button">🗓 Cerca entro: ${rangeLabel}</button>
      <button id="programsButton" class="chip" type="button">🔖 Eventi salvati</button>
      <button id="nearMeButtonTop" class="chip blue" type="button">📍 Cerca vicino a me</button>
    </div>

    <aside class="desktop-panel" id="desktopPanel">
      <h1>Scopri cosa succede vicino a te</h1>
      <p>Esplora la mappa, cerca una località o segnala un evento. Le proposte entrano in revisione prima della pubblicazione.</p>

      <div class="search-box">
        <input id="searchPlace" placeholder="Cerca evento o località disponibile" />
        <button id="searchPlaceButton" class="btn dark" type="button">Cerca</button>
      </div>

      <div class="panel-section" id="desktopInsertForm">
        ${insertFormFields("")}
        <button id="saveButton" class="btn full" type="button">Invia evento per revisione</button>
        <div class="hint">Clicca sulla mappa per impostare automaticamente la posizione.</div>
        <div id="status" class="status" aria-live="polite"></div>
      </div>

      <div class="legend">
        <div class="legend-item"><span class="legend-dot" style="background:#d92d20"></span>Musica</div>
        <div class="legend-item"><span class="legend-dot" style="background:#2e8b57"></span>Enogastronomia</div>
        <div class="legend-item"><span class="legend-dot" style="background:#2f6fed"></span>Cultura</div>
        <div class="legend-item"><span class="legend-dot" style="background:#7a5af8"></span>Altri eventi</div>
      </div>
    </aside>

    <div id="filterPanel" class="filter-panel">
      <h3>Quando vuoi uscire?</h3>
      <div class="filter-grid">
        ${filterButtons(DEFAULT_DATE_RANGE)}
      </div>
    </div>

    <div id="programsPanel" class="programs-panel">
      <h3>🔖 Eventi salvati</h3>
      <div id="programsList">Nessun evento salvato.</div>
    </div>

    <div id="map"></div>

    <div class="mobile-actions">
      <button id="openSearchMobile" class="btn dark" type="button">🔎 Cerca / segnala</button>
      <button id="nearMeButtonMobile" class="btn" type="button">📍 Cerca vicino a me</button>
    </div>

    <div id="mobileSheet" class="bottom-sheet">
      <div class="sheet-handle"></div>
      <button id="closeSheet" class="close-sheet" type="button">Chiudi</button>
      <h2>Cerca eventi</h2>
      <p>Cerca soltanto tra gli eventi attivi presenti su Atlas.</p>

      <div class="search-box">
        <input id="searchPlaceMobile" placeholder="Cerca evento o località disponibile" />
        <button id="searchPlaceButtonMobile" class="btn dark" type="button">Cerca</button>
      </div>
      <div class="search-note">La ricerca non sposta la mappa verso località prive di eventi attivi.</div>

      <button id="toggleInsertEventMobile" class="btn insert-event-toggle" type="button">＋ Inserisci un evento</button>

      <div id="mobileInsertForm" class="mobile-insert-form">
        <div class="panel-section">
          <h3>Inserisci un evento</h3>
          ${insertFormFields("Mobile")}
          <button id="saveButtonMobile" class="btn full" type="button">Invia evento per revisione</button>
          <div class="hint">Chiudi il pannello e clicca sulla mappa per impostare la posizione dell'evento.</div>
          <div id="statusMobile" class="status" aria-live="polite"></div>
        </div>
      </div>
    </div>

    <div id="stableEventOverlay" class="stable-event-overlay"></div>
    <section id="stableEventSheet" class="stable-event-sheet" aria-live="polite">
      <div id="stableEventContent"></div>
    </section>
    <div id="stableToast" class="stable-toast"></div>
  `;
}

function filterButtons(active: DateRangeKey): string {
  const options: DateRangeKey[] = ["today", "tomorrow", "weekend", "7", "15", "30"];
  const labels: Record<DateRangeKey, string> = {
    today: "Oggi",
    tomorrow: "Domani",
    weekend: "Weekend",
    "7": "7 giorni",
    "15": "15 giorni",
    "30": "30 giorni",
  };

  return options
    .map(
      (range) =>
        `<button class="filter-option${range === active ? " active" : ""}" data-range="${range}" type="button">${labels[range]}</button>`,
    )
    .join("");
}

function insertFormFields(suffix: string): string {
  return `
    <label for="title${suffix}">Titolo evento</label>
    <input id="title${suffix}" placeholder="Es. Concerto in piazza" />

    <label for="category${suffix}">Categoria</label>
    <select id="category${suffix}">
      <option value="music">Musica</option>
      <option value="food">Enogastronomia</option>
      <option value="culture">Cultura</option>
      <option value="other">Altri eventi</option>
    </select>

    <label for="start_date${suffix}">Inizio</label>
    <input id="start_date${suffix}" type="datetime-local" />

    <label for="end_date${suffix}">Fine</label>
    <input id="end_date${suffix}" type="datetime-local" />

    <label for="venue${suffix}">Luogo</label>
    <input id="venue${suffix}" placeholder="Es. Piazza San Lorenzo" />

    <label for="event_url${suffix}">Pagina ufficiale dell'evento</label>
    <input id="event_url${suffix}" type="url" placeholder="https://..." />

    <label for="image_url${suffix}">Immagine dell'evento (facoltativa)</label>
    <input id="image_url${suffix}" type="url" placeholder="https://..." />

    <label for="description${suffix}">Breve descrizione (facoltativa)</label>
    <textarea id="description${suffix}" placeholder="Informazioni utili sull'evento"></textarea>

    <label for="lat${suffix}">Latitudine</label>
    <input id="lat${suffix}" placeholder="Clicca sulla mappa" readonly />

    <label for="lng${suffix}">Longitudine</label>
    <input id="lng${suffix}" placeholder="Clicca sulla mappa" readonly />
  `;
}
