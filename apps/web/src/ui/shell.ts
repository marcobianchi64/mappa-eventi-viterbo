import {
  ATLAS_VERSION,
  CATEGORY_META,
  DEFAULT_DATE_RANGE,
  loadNearRadiusPreset,
  renderNearRadiusChips,
  type DateRangeKey,
  type EventCategory,
} from "@atlas/core";

export function renderShell(): string {
  const nearRadius = loadNearRadiusPreset();
  const nearRadiusChips = renderNearRadiusChips(nearRadius);

  return `
    <div class="atlas-version-check">v${ATLAS_VERSION}</div>

    <div class="topbar">
      <div class="brand-pill chip-tint-neutral">Project Atlas</div>
      <nav class="view-switch" aria-label="Vista">
        <button id="viewMapBtn" class="chip chip-tint-rose view-switch-btn active" type="button">🗺 Mappa</button>
        <button id="viewListBtn" class="chip chip-tint-rose view-switch-btn" type="button">📋 Elenco eventi</button>
      </nav>
      <div class="filter-menu-wrap atlas-map-only" id="filterMenuWrap">
        <button
          id="filterEventsButton"
          class="chip chip-tint-blue filter-events-trigger"
          type="button"
          aria-expanded="false"
          aria-controls="filterEventsPanel"
        >🔎 Filtro eventi</button>
        <div id="filterEventsPanel" class="filter-events-panel" aria-hidden="true">
          <div class="filter-events-columns">
            <div class="filter-events-col">
              <h3 class="filter-events-heading">Cosa</h3>
              <div class="filter-events-list" role="group" aria-label="Categoria">${renderFilterCategoryOptions()}</div>
            </div>
            <div class="filter-events-col">
              <h3 class="filter-events-heading">Quando</h3>
              <div class="filter-events-list" role="group" aria-label="Periodo">${renderFilterWhenOptions(DEFAULT_DATE_RANGE)}</div>
            </div>
          </div>
          <div class="filter-events-search">
            <p class="filter-events-search-lead">Cerca per nome o vicinanza</p>
            <div class="near-radius" role="group" aria-label="Distanza ricerca eventi">${nearRadiusChips}</div>
            <p id="nearRadiusHintDock" class="near-radius-hint small"></p>
            <div class="search-box">
              <input id="searchPlace" placeholder="Cerca evento o località" />
              <button id="searchPlaceButton" class="btn dark" type="button">Cerca</button>
            </div>
            <button id="nearMeButtonDock" class="btn full" type="button">📍 Cerca vicino a me</button>
            <div class="search-note">La ricerca mostra solo eventi attivi nel periodo selezionato.</div>
          </div>
        </div>
      </div>
      <button id="programsButton" class="chip chip-tint-amber" type="button">🔖 Eventi salvati</button>
    </div>

    <aside class="dock-panel atlas-map-only" id="desktopDock" aria-label="Azioni rapide">
      <button id="dockInsertBtn" class="dock-btn secondary" type="button">＋ Inserisci un evento</button>
    </aside>

    <div id="dockInsertFlyout" class="dock-flyout" aria-hidden="true">
      <div class="dock-flyout-header">
        <h2>Inserisci un evento</h2>
        <button id="closeInsertFlyout" class="dock-flyout-close" type="button" aria-label="Chiudi">×</button>
      </div>
      <p class="dock-flyout-lead">Segnala un evento: entra in revisione prima della pubblicazione.</p>
      <div class="panel-section" id="desktopInsertForm">
        ${insertFormFields("")}
        <button id="saveButton" class="btn full" type="button">Invia segnalazione per revisione</button>
        <div class="hint">Clicca sulla mappa per impostare la posizione.</div>
        <div id="status" class="status" aria-live="polite"></div>
      </div>
    </div>

    <div id="programsPanel" class="programs-panel">
      <h3>🔖 Eventi salvati</h3>
      <div id="programsList">Nessun evento salvato.</div>
    </div>

    <div id="map" class="atlas-map-only"></div>

    <main id="listPage" class="list-page atlas-list-only" hidden>
      <div id="eventListContent"></div>
    </main>

    <div class="mobile-actions atlas-map-only">
      <button id="openFilterMobile" class="btn chip-tint-blue-mobile" type="button">🔎 Filtro eventi</button>
      <button id="openInsertMobile" class="btn" type="button">＋ Inserisci evento</button>
    </div>

    <div id="mobileSheet" class="bottom-sheet atlas-map-only">
      <div class="sheet-handle"></div>
      <button id="closeSheet" class="close-sheet" type="button">Chiudi</button>
      <div id="mobileFilterPanel">
        <h2>Filtro eventi</h2>
        <div class="filter-events-columns">
          <div class="filter-events-col">
            <h3 class="filter-events-heading">Cosa</h3>
            <div class="filter-events-list filter-events-list-mobile" role="group" aria-label="Categoria">${renderFilterCategoryOptions()}</div>
          </div>
          <div class="filter-events-col">
            <h3 class="filter-events-heading">Quando</h3>
            <div class="filter-events-list filter-events-list-mobile" role="group" aria-label="Periodo">${renderFilterWhenOptions(DEFAULT_DATE_RANGE)}</div>
          </div>
        </div>
        <div class="filter-events-search">
          <p class="filter-events-search-lead">Cerca per nome o vicinanza</p>
          <div class="near-radius" role="group" aria-label="Distanza ricerca eventi">${nearRadiusChips}</div>
          <p id="nearRadiusHintMobile" class="near-radius-hint small"></p>
          <div class="search-box">
            <input id="searchPlaceMobile" placeholder="Cerca evento o località" />
            <button id="searchPlaceButtonMobile" class="btn dark" type="button">Cerca</button>
          </div>
          <button id="nearMeButtonMobile" class="btn full" type="button">📍 Cerca vicino a me</button>
          <div class="search-note">La ricerca non sposta la mappa verso località senza eventi attivi.</div>
        </div>
      </div>
      <div id="mobileInsertPanel" class="hidden">
        <h2>Inserisci un evento</h2>
        <p class="dock-flyout-lead">Segnala un evento per la revisione.</p>
        <div class="panel-section">
          ${insertFormFields("Mobile")}
          <button id="saveButtonMobile" class="btn full" type="button">Invia segnalazione per revisione</button>
          <div class="hint">Clicca sulla mappa per impostare la posizione.</div>
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

function renderFilterCategoryOptions(): string {
  const order: (EventCategory | "all")[] = [
    "all",
    "culture",
    "food",
    "music",
    "sport",
    "families",
    "other",
  ];
  return order
    .map((key) => {
      if (key === "all") {
        return `<button type="button" class="filter-events-option filter-category-option active" data-category="all">Tutti gli eventi</button>`;
      }
      const meta = CATEGORY_META[key];
      const label = key === "other" ? "Altri" : meta.label;
      return `<button type="button" class="filter-events-option filter-category-option" data-category="${key}">
        <span class="filter-category-dot" style="background:${meta.color}"></span>${label}
      </button>`;
    })
    .join("");
}

function renderFilterWhenOptions(active: DateRangeKey): string {
  const options: DateRangeKey[] = ["today", "tomorrow", "weekend", "7", "15", "30", "60"];
  const labels: Record<DateRangeKey, string> = {
    today: "Oggi",
    tomorrow: "Domani",
    weekend: "Weekend",
    "7": "7 giorni",
    "15": "15 giorni",
    "30": "30 giorni",
    "60": "60 giorni",
  };

  return options
    .map(
      (range) =>
        `<button class="filter-events-option filter-when-option${range === active ? " active" : ""}" data-range="${range}" type="button">${labels[range]}</button>`,
    )
    .join("");
}

function insertFormFields(suffix: string): string {
  return `
    <label for="event_url${suffix}">Link della pagina dell'evento</label>
    <input id="event_url${suffix}" type="url" placeholder="https://..." />

    <label for="title${suffix}">Titolo evento</label>
    <input id="title${suffix}" placeholder="Es. Concerto in piazza" />

    <label for="category${suffix}">Categoria</label>
    <select id="category${suffix}">
      <option value="music">Musica</option>
      <option value="food">Enogastronomia</option>
      <option value="culture">Cultura</option>
      <option value="sport">Sport</option>
      <option value="families">Famiglie</option>
      <option value="other">Altri eventi</option>
    </select>

    <label for="start_date${suffix}">Inizio</label>
    <input id="start_date${suffix}" type="datetime-local" />

    <label for="end_date${suffix}">Fine</label>
    <input id="end_date${suffix}" type="datetime-local" />

    <label for="venue${suffix}">Luogo</label>
    <input id="venue${suffix}" placeholder="Es. Piazza San Lorenzo, Viterbo" />

    <label for="image_url${suffix}">Immagine dell'evento (facoltativa)</label>
    <input id="image_url${suffix}" type="url" placeholder="https://..." />

    <label for="description${suffix}">Breve descrizione (facoltativa)</label>
    <textarea id="description${suffix}" placeholder="Informazioni utili sull'evento"></textarea>

    <label for="contact${suffix}">Contatto per verifica *</label>
    <input id="contact${suffix}" type="text" placeholder="Email, WhatsApp o telefono" required />

    <label for="lat${suffix}">Latitudine</label>
    <input id="lat${suffix}" placeholder="Clicca sulla mappa" readonly />

    <label for="lng${suffix}">Longitudine</label>
    <input id="lng${suffix}" placeholder="Clicca sulla mappa" readonly />
  `;
}
