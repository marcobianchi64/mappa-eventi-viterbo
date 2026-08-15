import {
  ATLAS_VERSION,
  CATEGORY_META,
  DEFAULT_DATE_RANGE,
  getEditionListTitle,
  getEditionTerritoryLabel,
  loadNearRadiusPreset,
  renderNearRadiusChips,
  type DateRangeKey,
  type EventCategory,
} from "@atlas/core";

export function renderShell(): string {
  const nearRadius = loadNearRadiusPreset();
  const nearRadiusChips = renderNearRadiusChips(nearRadius);
  const territory = getEditionTerritoryLabel();
  const listTitle = getEditionListTitle();

  return `
    <div class="atlas-version-check">v${ATLAS_VERSION}</div>

    <header class="atlas-header">
      <div class="atlas-header-inner">
        <div class="topbar">
          <div class="brand-mark" title="${listTitle}">
            <span class="brand-name">Atlas</span>
            <span class="brand-territory">${territory}</span>
          </div>
          <nav class="view-switch topbar-nav-primary" aria-label="Vista">
            <button id="viewMapBtn" class="view-switch-btn active" type="button" title="Mappa eventi"><span class="view-switch-icon">🗺</span><span class="view-switch-label">Mappa</span></button>
            <button id="viewListBtn" class="view-switch-btn" type="button" title="Elenco eventi"><span class="view-switch-icon">📋</span><span class="view-switch-label">Elenco</span></button>
          </nav>
          <div class="topbar-actions">
            <div class="topbar-actions-primary">
              <button id="pharmacyButton" class="topbar-btn topbar-btn-service topbar-btn-pharmacy" type="button" title="Farmacie di turno aperte" aria-expanded="false" aria-controls="pharmacyPanel"><span>💊</span><span class="topbar-btn-label">Farmacie aperte</span></button>
              <button id="cinemaButton" class="topbar-btn topbar-btn-service topbar-btn-cinema" type="button" title="Programmazione cinema in provincia" aria-expanded="false" aria-controls="cinemaPanel"><span>🎬</span><span class="topbar-btn-label">Cinema</span></button>
            </div>
            <div class="topbar-actions-secondary">
            <div class="filter-menu-wrap" id="filterMenuWrap">
              <button
                id="filterEventsButton"
                class="topbar-btn topbar-btn-muted topbar-btn-filter filter-events-trigger"
                type="button"
                aria-expanded="false"
                aria-controls="filterEventsPanel"
              ><span>🔎</span><span class="topbar-btn-label">Filtra</span></button>
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
                <div class="filter-events-search atlas-map-only">
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
            <button id="programsButton" class="topbar-btn topbar-btn-muted topbar-btn-saved" type="button" title="Eventi salvati"><span>🔖</span><span class="topbar-btn-label">Salvati</span></button>
            </div>
            <button id="topInsertBtn" class="topbar-btn topbar-btn-insert atlas-map-only" type="button" title="Inserisci evento"><span>＋</span><span class="topbar-btn-label">Inserisci</span></button>
          </div>
        </div>
        <p id="activeFiltersBar" class="active-filters-bar" aria-live="polite"></p>
      </div>
      <div id="atlasPromoSlot" class="atlas-promo-slot atlas-map-only" hidden aria-hidden="true"></div>
    </header>

    <div id="dockInsertFlyout" class="dock-flyout atlas-map-only" aria-hidden="true">
      <div class="dock-flyout-header">
        <h2 id="insertFlyoutTitle">Segnala un evento</h2>
        <button id="closeInsertFlyout" class="dock-flyout-close" type="button" aria-label="Chiudi">×</button>
      </div>
      <p class="dock-flyout-lead">Compila i campi che conosci: un revisore verificherà prima della pubblicazione.</p>
      <div class="panel-section insert-form-root" id="desktopInsertForm">
        ${insertFormFields("")}
        <button id="saveButton" class="btn full" type="button">Invia segnalazione per revisione</button>
        <div id="status" class="status" aria-live="polite"></div>
      </div>
    </div>

    <div id="programsPanel" class="programs-panel">
      <h3>🔖 Salvati</h3>
      <div id="programsList">Nessun evento salvato.</div>
    </div>

    <div id="pharmacyPanel" class="utility-services-panel utility-panel-pharmacy">
      <h3>💊 Farmacie aperte</h3>
      <div id="pharmacyPanelList"></div>
    </div>

    <div id="cinemaPanel" class="utility-services-panel utility-panel-cinema">
      <h3>🎬 Cinema</h3>
      <div id="cinemaPanelList"></div>
    </div>

    <div id="map" class="atlas-map-only"></div>

    <main id="listPage" class="list-page atlas-list-only" hidden>
      <div id="eventListContent"></div>
    </main>

    <div class="mobile-actions atlas-map-only">
      <button id="openFilterMobile" class="btn chip-tint-blue-mobile" type="button">🔎 Filtra</button>
      <button id="openInsertMobile" class="btn chip-tint-mint-mobile" type="button">＋ Inserisci evento</button>
    </div>

    <div id="mobileSheet" class="bottom-sheet atlas-map-only">
      <div class="sheet-handle"></div>
      <button id="closeSheet" class="close-sheet" type="button">Chiudi</button>
      <div id="mobileFilterPanel">
        <h2>Filtra</h2>
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
      <div id="mobileInsertPanel" class="hidden insert-form-root">
        <h2 id="insertMobileTitle">Segnala un evento</h2>
        <p class="dock-flyout-lead">Compila i campi che conosci: un revisore verificherà prima della pubblicazione.</p>
        <div class="panel-section">
          ${insertFormFields("Mobile")}
          <button id="saveButtonMobile" class="btn full" type="button">Invia segnalazione per revisione</button>
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
  const kindName = `submissionKind${suffix}`;
  const contactChannelName = `contactChannel${suffix}`;
  return `
    <div class="insert-intro-card">
      <p class="insert-intro-eyebrow">Tipo segnalazione</p>
      <div class="insert-segment-row" role="radiogroup" aria-label="Tipo segnalazione">
        <label class="insert-segment-option">
          <input type="radio" name="${kindName}" value="new" class="submission-kind-input" checked />
          <span class="insert-segment-title">Nuovo evento</span>
          <span class="insert-segment-desc">Qualcosa che non è ancora in elenco</span>
        </label>
        <label class="insert-segment-option">
          <input type="radio" name="${kindName}" value="correction" class="submission-kind-input" />
          <span class="insert-segment-title">Migliora esistente</span>
          <span class="insert-segment-desc">Foto, orari, link o indirizzo</span>
        </label>
      </div>
    </div>
    <input type="hidden" id="related_event_id${suffix}" value="" />

    <label for="event_url${suffix}">Link della pagina dell'evento</label>
    <input id="event_url${suffix}" type="url" placeholder="https://..." />

    <label for="title${suffix}">Titolo evento *</label>
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

    <label for="start_date${suffix}">Inizio *</label>
    <input id="start_date${suffix}" type="datetime-local" />

    <label for="end_date${suffix}">Fine</label>
    <input id="end_date${suffix}" type="datetime-local" />

    <label for="venue${suffix}">Luogo (indirizzo o descrizione)</label>
    <input id="venue${suffix}" placeholder="Es. Piazza San Lorenzo, Viterbo" />

    <div class="insert-location-panel">
      <p id="insertLocationStatus${suffix}" class="insert-location-status">Posizione: indica il punto sulla mappa oppure scrivi un indirizzo preciso.</p>
      <button type="button" class="btn insert-pick-map-btn" id="pickMapLocation${suffix}">📍 Indica posizione sulla mappa</button>
      <input type="hidden" id="lat${suffix}" value="" />
      <input type="hidden" id="lng${suffix}" value="" />
    </div>

    <label for="image_url${suffix}">Immagine dell'evento (facoltativa)</label>
    <input id="image_url${suffix}" type="url" placeholder="https://..." />

    <label for="description${suffix}" id="descriptionLabel${suffix}">Breve descrizione (facoltativa)</label>
    <textarea id="description${suffix}" placeholder="Informazioni utili sull'evento"></textarea>

    <div class="insert-contact-card">
      <p class="insert-intro-eyebrow">Contatto per verifica <span aria-hidden="true">*</span></p>
      <p class="insert-contact-policy">Solo messaggi scritti (email o WhatsApp). Niente telefonate.</p>
      <div class="insert-segment-row insert-segment-row-compact" role="radiogroup" aria-label="Canale contatto">
        <label class="insert-segment-option insert-segment-option-compact">
          <input type="radio" name="${contactChannelName}" value="email" class="contact-channel-input" checked />
          <span class="insert-segment-title">Email</span>
        </label>
        <label class="insert-segment-option insert-segment-option-compact">
          <input type="radio" name="${contactChannelName}" value="whatsapp" class="contact-channel-input" />
          <span class="insert-segment-title">WhatsApp</span>
        </label>
      </div>
      <input id="contact${suffix}" type="email" inputmode="email" autocomplete="email" placeholder="nome@esempio.it" required />
    </div>
  `;
}
