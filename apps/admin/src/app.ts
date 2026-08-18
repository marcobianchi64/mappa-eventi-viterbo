import {
  applyMapUiScale,
  ATLAS_VERSION,
  compareMapRegistryFromEvents,
  escapeHtml,
  formatComuneLabel,
  formatDate,
  formatSubmissionContactLabel,
  inferComuneForEvent,
  isEventVisibleInRange,
  listViterboComuni,
  getCategoryMeta,
  isRegistryInPubblicazione,
  loadDiscoverySession,
  type AtlasEvent,
  type AtlasExperience,
  type SourceInput,
} from "@atlas/core";
import {
  approveSubmissionAsEvent,
  createSource,
  fetchAllEventsAdmin,
  fetchOperationalAlerts,
  fetchExperiencesAdmin,
  fetchPlacesAdmin,
  fetchPendingEvents,
  fetchPendingSubmissions,
  fetchSources,
  fetchVerifiedEvents,
  fetchVerifiedEventsAdmin,
  getSession,
  signInWithOtp,
  updateEventReview,
  updateExperienceStatus,
  updateOperationalAlertStatus,
  updatePlaceStatus,
  updateSource,
  updateSubmissionStatus,
} from "@atlas/supabase-client";
import {
  bindDiscoveryPanel,
  formatPublishResultHtml,
  publishDiscoveryRows,
  renderDiscoveryPanelHtml,
  type ProcessedDiscoveryRow,
} from "./discovery/discovery-panel.js";
import { EventEditor } from "./events/event-editor.js";
import { ExperienceEditor } from "./experiences/experience-editor.js";
import { AdminMapService } from "./map/admin-map.js";
import {
  bindRegistryPanel,
  countRegistryInPubblicazione,
  DEFAULT_REGISTRY_FILTERS,
  renderRegistryPanelHtml,
  type RegistryFilters,
} from "./registry/event-registry.js";

type AdminTab =
  | "dashboard"
  | "map"
  | "discovery"
  | "registry"
  | "places"
  | "coverage"
  | "experiences"
  | "submissions"
  | "sources"
  | "events";

export class AdminApp {
  private tab: AdminTab = "dashboard";
  private mapService: AdminMapService | null = null;
  private eventEditor: EventEditor | null = null;
  private mapEvents: AtlasEvent[] = [];
  private registryFilters: RegistryFilters = { ...DEFAULT_REGISTRY_FILTERS };
  private pendingMapEventId: string | null = null;

  start(): void {
    const root = document.getElementById("app");
    if (!root) throw new Error("Elemento #app non trovato");
    this.renderShell(root);
    document.getElementById("loginBtn")?.addEventListener("click", () => void this.login());
    void this.checkSession();
    this.applyDeepLinkTab();

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    window.addEventListener("resize", () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        applyMapUiScale();
        this.mapService?.refreshScale();
      }, 150);
    });
  }

  private applyDeepLinkTab(): void {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab") as AdminTab | null;
    if (tab) this.tab = tab;
  }

  private renderShell(root: HTMLElement): void {
    root.innerHTML = `
      <header>
        <h1>Project Atlas — Control Center</h1>
      </header>
      <main>
        <section id="loginBox" class="card">
          <h2>Accesso amministratore</h2>
          <input id="email" type="email" placeholder="Email amministratore" />
          <button class="primary" id="loginBtn" type="button">Invia link di accesso</button>
          <p id="loginStatus" class="small"></p>
        </section>
        <section id="dashboard" class="hidden">
          <nav class="tabs">
            <button type="button" data-tab="dashboard" class="tab active">Dashboard</button>
            <button type="button" data-tab="map" class="tab">Mappa</button>
            <button type="button" data-tab="discovery" class="tab">Scoperta</button>
            <button type="button" data-tab="registry" class="tab">Registro</button>
            <button type="button" data-tab="places" class="tab">Patrimonio</button>
            <button type="button" data-tab="coverage" class="tab">Copertura</button>
            <button type="button" data-tab="experiences" class="tab">Esperienze</button>
            <button type="button" data-tab="submissions" class="tab">Segnalazioni</button>
            <button type="button" data-tab="events" class="tab">Revisione</button>
            <button type="button" data-tab="sources" class="tab">Fonti</button>
          </nav>
          <div id="panel" class="card">Caricamento...</div>
        </section>
      </main>
    `;
  }

  private bindTabs(): void {
    document.querySelectorAll(".tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.tab = (btn as HTMLButtonElement).dataset.tab as AdminTab;
        document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        void this.renderPanel();
      });
    });
  }

  private async login(): Promise<void> {
    const email = (document.getElementById("email") as HTMLInputElement).value.trim();
    const status = document.getElementById("loginStatus");
    if (!email) {
      if (status) status.textContent = "Inserisci una email.";
      return;
    }
    if (status) status.textContent = "Invio link in corso...";
    try {
      await signInWithOtp(email, window.location.href);
      if (status) status.textContent = "Controlla la tua email e clicca il link di accesso.";
    } catch (error) {
      if (status) status.textContent = `Errore: ${(error as Error).message}`;
    }
  }

  private async checkSession(): Promise<void> {
    try {
      const session = await getSession();
      if (session) {
        document.getElementById("loginBox")?.classList.add("hidden");
        document.getElementById("dashboard")?.classList.remove("hidden");
        this.bindTabs();
        document.querySelectorAll(".tab").forEach((b) => {
          b.classList.toggle("active", (b as HTMLButtonElement).dataset.tab === this.tab);
        });
        await this.renderPanel();
      }
    } catch (error) {
      console.error(error);
    }
  }

  private async renderPanel(): Promise<void> {
    const panel = document.getElementById("panel");
    if (!panel) return;

    panel.innerHTML = "Caricamento...";
    this.mapService = null;

    try {
      if (this.tab === "dashboard") await this.renderDashboard(panel);
      else if (this.tab === "map") await this.renderMap(panel);
      else if (this.tab === "discovery") await this.renderDiscovery(panel);
      else if (this.tab === "registry") await this.renderRegistry(panel);
      else if (this.tab === "places") await this.renderPlaces(panel);
      else if (this.tab === "coverage") await this.renderCoverage(panel);
      else if (this.tab === "experiences") await this.renderExperiences(panel);
      else if (this.tab === "submissions") await this.renderSubmissions(panel);
      else if (this.tab === "events") await this.renderEvents(panel);
      else if (this.tab === "sources") await this.renderSources(panel);
    } catch (error) {
      panel.innerHTML = `<p class="error">Errore: ${escapeHtml((error as Error).message)}</p>`;
    }
  }

  private async renderDashboard(panel: HTMLElement): Promise<void> {
    const [sources, pendingEvents, submissions, operationalAlerts] = await Promise.all([
      fetchSources(),
      fetchPendingEvents(),
      fetchPendingSubmissions(),
      fetchOperationalAlerts(),
    ]);

    const activeSources = sources.filter((s) => s.status === "active").length;
    const errorSources = sources.filter((s) => s.status === "error").length;

    panel.innerHTML = `
      <h2>Stato piattaforma</h2>
      <div class="stats">
        <div class="stat"><strong>${activeSources}</strong><span>Fonti attive</span></div>
        <div class="stat"><strong>${pendingEvents.length}</strong><span>Eventi in revisione</span></div>
        <div class="stat"><strong>${submissions.length}</strong><span>Segnalazioni utenti</span></div>
        <div class="stat"><strong>${errorSources}</strong><span>Fonti in errore</span></div>
        <div class="stat"><strong>${operationalAlerts.length}</strong><span>Alert dati aperti</span></div>
      </div>
      <div class="quick-actions">
        <button type="button" class="primary" data-goto="discovery">Vai a Scoperta</button>
        <button type="button" class="primary" data-goto="map">Apri mappa gestore</button>
        <button type="button" class="primary" data-goto="registry">Registro eventi</button>
        <button type="button" class="primary" data-goto="places">Patrimonio dati</button>
        <button type="button" class="primary" data-goto="submissions">Segnalazioni (${submissions.length})</button>
      </div>
      <section class="operations-alerts">
        <h3>Qualità dati e copertura</h3>
        ${
          operationalAlerts.length
            ? `<ul class="operations-alert-list">${operationalAlerts
                .map(
                  (alert) => `
                    <li>
                      <strong>${escapeHtml(alert.title)}</strong>
                      <span>${escapeHtml(alert.message)} · ${alert.consecutive_misses} controlli</span>
                      <button type="button" data-alert-status="acknowledged" data-alert-id="${escapeHtml(alert.id)}">Preso in carico</button>
                      <button type="button" data-alert-status="resolved" data-alert-id="${escapeHtml(alert.id)}">Risolto</button>
                    </li>`,
                )
                .join("")}</ul>`
            : "<p class=\"small\">Nessun alert dati aperto.</p>"
        }
      </section>
      <p class="small">Operazioni quotidiane: cartella <code>ops/desktop/</code> sul Desktop.</p>
    `;

    panel.querySelectorAll("[data-goto]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.tab = (btn as HTMLButtonElement).dataset.goto as AdminTab;
        document.querySelectorAll(".tab").forEach((b) => {
          b.classList.toggle("active", (b as HTMLButtonElement).dataset.tab === this.tab);
        });
        void this.renderPanel();
      });
    });
    panel.querySelectorAll<HTMLButtonElement>("[data-alert-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.alertId;
        const status = btn.dataset.alertStatus;
        if (!id || (status !== "acknowledged" && status !== "resolved")) return;
        void updateOperationalAlertStatus(id, status).then(() => this.renderPanel());
      });
    });
  }

  private coverageRange: "7" | "15" | "30" = "30";

  /** Copertura territoriale: eventi in pubblicazione per comune nel periodo scelto. */
  private async renderCoverage(panel: HTMLElement): Promise<void> {
    const events = await fetchVerifiedEvents();
    const inRange = events.filter((event) => isEventVisibleInRange(event, this.coverageRange));

    const counts = new Map<string, number>(listViterboComuni().map((key) => [key, 0]));
    let unresolved = 0;
    for (const event of inRange) {
      const key = inferComuneForEvent(event);
      if (key && counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
      else unresolved += 1;
    }

    const rows = [...counts.entries()].sort(
      (a, b) => a[1] - b[1] || a[0].localeCompare(b[0], "it"),
    );
    const uncovered = rows.filter(([, count]) => count === 0);

    const rangeChips = (["7", "15", "30"] as const)
      .map(
        (range) =>
          `<button type="button" class="tab${this.coverageRange === range ? " active" : ""}" data-coverage-range="${range}">${range} giorni</button>`,
      )
      .join("");

    panel.innerHTML = `
      <h2>Copertura territoriale</h2>
      <p class="small">Eventi in pubblicazione per comune. I comuni scoperti indicano dove attivare fonti e referenti (pro loco, comune, associazioni).</p>
      <div class="tabs" role="group" aria-label="Periodo">${rangeChips}</div>
      <div class="stats">
        <div class="stat"><strong>${inRange.length}</strong><span>Eventi nel periodo</span></div>
        <div class="stat"><strong>${rows.length - uncovered.length}/${rows.length}</strong><span>Comuni coperti</span></div>
        <div class="stat"><strong>${uncovered.length}</strong><span>Comuni senza eventi</span></div>
        ${unresolved > 0 ? `<div class="stat"><strong>${unresolved}</strong><span>Eventi senza comune</span></div>` : ""}
      </div>
      <div class="places-list">
        ${rows
          .map(([key, count]) => {
            const label = formatComuneLabel(key);
            return `
              <article class="place-row${count === 0 ? " coverage-row-empty" : ""}">
                <div>
                  <strong>${escapeHtml(label)}</strong>
                  <span>${count === 0 ? "Nessun evento nel periodo — serve un referente locale" : `${count} eventi in pubblicazione`}</span>
                </div>
                <strong class="coverage-count${count === 0 ? " zero" : ""}">${count}</strong>
              </article>`;
          })
          .join("")}
      </div>
    `;

    panel.querySelectorAll<HTMLButtonElement>("[data-coverage-range]").forEach((button) => {
      button.addEventListener("click", () => {
        this.coverageRange = button.dataset.coverageRange as "7" | "15" | "30";
        void this.renderPanel();
      });
    });
  }

  private async renderExperiences(panel: HTMLElement): Promise<void> {
    const experiences = await fetchExperiencesAdmin();
    const active = experiences.filter((item) => item.status === "active" || item.status === "seasonal").length;
    const typeLabels: Record<AtlasExperience["experience_type"], string> = {
      tour: "Tour",
      tasting: "Degustazione",
      food: "Food",
      activity: "Attività",
      workshop: "Laboratorio",
      trail: "Percorso",
      lodging: "Ospitalità",
      other: "Altro",
    };

    panel.innerHTML = `
      <h2>Esperienze</h2>
      <p class="small">Offerte ripetibili, gratuite o a pagamento. Non sono eventi con data: si inseriscono qui e si pubblicano cambiando stato.</p>
      <div class="stats">
        <div class="stat"><strong>${experiences.length}</strong><span>Esperienze</span></div>
        <div class="stat"><strong>${active}</strong><span>Pubblicabili</span></div>
        <div class="stat"><strong>${experiences.filter((item) => item.status === "unknown").length}</strong><span>Da verificare</span></div>
      </div>
      <div class="map-layout">
        <div>
          <button type="button" class="primary" id="newExperienceBtn">＋ Nuova esperienza</button>
          <div class="places-list" style="margin-top:12px">
            ${
              experiences
                .map(
                  (item) => `
                    <article class="place-row">
                      <div>
                        <strong>${escapeHtml(item.title)}</strong>
                        <span>${escapeHtml(typeLabels[item.experience_type])} · ${escapeHtml(item.municipality ?? "Comune da definire")}</span>
                        <small>${escapeHtml(item.price_hint)} · ${escapeHtml(item.repeatability)}</small>
                      </div>
                      <div class="row-actions">
                        <label>Stato
                          <select data-experience-status data-experience-id="${escapeHtml(item.id)}">
                            ${(["active", "unknown", "seasonal", "closed"] as const)
                              .map((status) => `<option value="${status}"${item.status === status ? " selected" : ""}>${status}</option>`)
                              .join("")}
                          </select>
                        </label>
                        <button type="button" class="btn-secondary" data-experience-edit="${escapeHtml(item.id)}">Modifica</button>
                      </div>
                    </article>`,
                )
                .join("") || "<p class=\"small\">Ancora nessuna esperienza: usa «Nuova esperienza» per la prima offerta verificata.</p>"
            }
          </div>
        </div>
        <div id="experienceEditorHost" class="editor-host"></div>
      </div>`;

    const editorHost = panel.querySelector("#experienceEditorHost") as HTMLElement;
    const editor = new ExperienceEditor({
      container: editorHost,
      onSaved: () => void this.renderPanel(),
      onClose: () => {},
    });

    panel.querySelector("#newExperienceBtn")?.addEventListener("click", () => editor.openNew());
    panel.querySelectorAll<HTMLButtonElement>("[data-experience-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        const experience = experiences.find((item) => item.id === button.dataset.experienceEdit);
        if (experience) editor.open(experience);
      });
    });
    panel.querySelectorAll<HTMLSelectElement>("[data-experience-status]").forEach((select) => {
      select.addEventListener("change", () => {
        if (select.dataset.experienceId) void updateExperienceStatus(select.dataset.experienceId, select.value as AtlasExperience["status"]).then(() => this.renderPanel());
      });
    });
  }

  private async renderPlaces(panel: HTMLElement): Promise<void> {
    const places = await fetchPlacesAdmin();
    const typeLabel: Record<string, string> = {
      cinema: "Cinema",
      pharmacy: "Farmacia",
      theater: "Teatro",
      museum: "Museo",
      municipality: "Comune",
      pro_loco: "Pro loco",
      venue: "Luogo",
      other: "Altro",
    };
    const active = places.filter((place) => place.status === "active").length;
    const review = places.filter((place) => place.status === "unknown").length;

    panel.innerHTML = `
      <h2>Patrimonio dati</h2>
      <p class="small">Anagrafiche riutilizzabili, separate dalle osservazioni quotidiane. Cinema e farmacie sono i primi domini pilota.</p>
      <div class="stats">
        <div class="stat"><strong>${places.length}</strong><span>Luoghi registrati</span></div>
        <div class="stat"><strong>${active}</strong><span>Verificati attivi</span></div>
        <div class="stat"><strong>${review}</strong><span>Da verificare</span></div>
      </div>
      <label class="places-filter">Filtra
        <select data-places-filter>
          <option value="">Tutti i tipi</option>
          ${[...new Set(places.map((place) => place.place_type))]
            .map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(typeLabel[type] ?? type)}</option>`)
            .join("")}
        </select>
      </label>
      <div class="places-list" data-places-list>
        ${this.renderPlacesRows(places, typeLabel)}
      </div>
    `;

    const list = panel.querySelector<HTMLElement>("[data-places-list]");
    panel.querySelector<HTMLSelectElement>("[data-places-filter]")?.addEventListener("change", (event) => {
      const selected = (event.target as HTMLSelectElement).value;
      if (list) list.innerHTML = this.renderPlacesRows(places.filter((place) => !selected || place.place_type === selected), typeLabel);
      this.bindPlaceStatusActions(panel);
    });
    this.bindPlaceStatusActions(panel);
  }

  private renderPlacesRows(
    places: Awaited<ReturnType<typeof fetchPlacesAdmin>>,
    typeLabel: Record<string, string>,
  ): string {
    if (!places.length) return `<p class="small">Nessun luogo ancora sincronizzato. Esegui i seed Supabase.</p>`;
    return places
      .map(
        (place) => `
          <article class="place-row">
            <div>
              <strong>${escapeHtml(place.name)}</strong>
              <span>${escapeHtml(typeLabel[place.place_type] ?? place.place_type)} · ${escapeHtml(place.municipality ?? "Comune non indicato")}</span>
              ${place.address ? `<span>${escapeHtml(place.address)}</span>` : ""}
              <small>${escapeHtml(place.registry_source ?? place.primary_source_id ?? "Fonte da registrare")}${place.registry_observed_at ? ` · rilevato ${escapeHtml(place.registry_observed_at)}` : ""}</small>
            </div>
            <label>Stato
              <select data-place-status data-place-id="${escapeHtml(place.id)}">
                ${(["active", "unknown", "seasonal", "closed"] as const)
                  .map((status) => `<option value="${status}"${place.status === status ? " selected" : ""}>${status}</option>`)
                  .join("")}
              </select>
            </label>
          </article>`,
      )
      .join("");
  }

  private bindPlaceStatusActions(panel: HTMLElement): void {
    panel.querySelectorAll<HTMLSelectElement>("[data-place-status]").forEach((select) => {
      select.addEventListener("change", () => {
        const id = select.dataset.placeId;
        const status = select.value as "active" | "unknown" | "seasonal" | "closed";
        if (!id) return;
        select.disabled = true;
        void updatePlaceStatus(id, status)
          .then(() => this.renderPanel())
          .catch((error: unknown) => {
            select.disabled = false;
            window.alert(`Aggiornamento non riuscito: ${(error as Error).message}`);
          });
      });
    });
  }

  private async renderMap(panel: HTMLElement): Promise<void> {
    const pendingId = this.pendingMapEventId;
    const [mapEvents, allEvents] = await Promise.all([
      fetchVerifiedEventsAdmin(),
      pendingId ? fetchAllEventsAdmin(2000) : Promise.resolve([] as AtlasEvent[]),
    ]);
    this.mapEvents = mapEvents;
    const mapDisplayEvents = mapEvents.filter(isRegistryInPubblicazione);
    const pubStats = countRegistryInPubblicazione(mapEvents);
    panel.innerHTML = `
      <h2>Mappa gestore</h2>
      <p class="small map-pin-stats" id="adminMapPinStats">📍 … pin in pubblicazione · confronta con il registro (colonna #)</p>
      <p class="small">Clicca un pin per modificare titolo, date e link. Conferma con «Salva modifiche». Stessi pin della mappa utente (stesso elenco eventi in pubblicazione).</p>
      <div class="map-layout">
        <div id="adminMap" class="admin-map"></div>
        <div id="eventEditorHost" class="editor-host"></div>
      </div>
    `;

    const editorHost = panel.querySelector("#eventEditorHost") as HTMLElement;
    this.eventEditor = new EventEditor({
      container: editorHost,
      onSaved: () => void this.renderPanel(),
      onClose: () => {},
    });

    this.mapService = new AdminMapService("adminMap", (event) => {
      this.eventEditor?.open(event);
      this.mapService?.focus(event);
    });
    const pinCount = this.mapService.render(mapDisplayEvents);
    const statsEl = panel.querySelector("#adminMapPinStats");
    if (statsEl) {
      const coordNote =
        pubStats.withoutCoords > 0 ? ` · ${pubStats.withoutCoords} in pubblicazione senza coordinate` : "";
      statsEl.textContent = `📍 ${pinCount} pin in pubblicazione · ${pubStats.total} eventi in pubblicazione nel registro${coordNote} · v${ATLAS_VERSION}`;
    }
    setTimeout(() => this.mapService?.invalidateSize(), 200);

    if (this.pendingMapEventId) {
      const target =
        this.mapEvents.find((e) => e.date_event === this.pendingMapEventId) ??
        allEvents.find((e) => e.date_event === this.pendingMapEventId);
      if (target) {
        this.eventEditor?.open(target);
        if (this.mapEvents.some((e) => e.date_event === target.date_event)) {
          this.mapService?.focus(target);
        }
      }
      this.pendingMapEventId = null;
    }
  }

  private async renderRegistry(panel: HTMLElement): Promise<void> {
    const [events, sources, publicEvents] = await Promise.all([
      fetchAllEventsAdmin(5000),
      fetchSources(),
      fetchVerifiedEvents(),
    ]);
    const compareReport = compareMapRegistryFromEvents(events, {
      rangeDays: "60",
      publicEvents,
    });
    this.mountRegistryPanel(panel, events, sources, compareReport);
  }

  private mountRegistryPanel(
    panel: HTMLElement,
    events: AtlasEvent[],
    sources: Awaited<ReturnType<typeof fetchSources>>,
    compareReport: ReturnType<typeof compareMapRegistryFromEvents>,
  ): void {
    panel.innerHTML = renderRegistryPanelHtml(events, sources, this.registryFilters, compareReport);
    bindRegistryPanel(panel, {
      events,
      sources,
      filters: this.registryFilters,
      compareReport,
      onFiltersChange: (filters) => {
        this.registryFilters = filters;
        this.mountRegistryPanel(panel, events, sources, compareReport);
      },
      onEditEvent: (eventId) => {
        this.pendingMapEventId = eventId;
        this.tab = "map";
        document.querySelectorAll(".tab").forEach((b) => {
          b.classList.toggle("active", (b as HTMLButtonElement).dataset.tab === "map");
        });
        void this.renderPanel();
      },
      onArchived: () => void this.renderPanel(),
    });
  }

  private async renderDiscovery(panel: HTMLElement): Promise<void> {
    const session = loadDiscoverySession();
    panel.innerHTML = renderDiscoveryPanelHtml(session);

    bindDiscoveryPanel(panel, {
      loadExisting: async () => (await fetchAllEventsAdmin()).filter((e) => e.archived !== true),
      onBlockCount: (count) => {
        const el = panel.querySelector("#blockCount");
        if (el) el.textContent = String(count);
      },
      onPublish: (rows, results, existing) => this.publishDiscovery(rows, results, existing),
    });
  }

  private async publishDiscovery(
    rows: ProcessedDiscoveryRow[],
    results: HTMLElement,
    existing: AtlasEvent[],
  ): Promise<void> {
    try {
      const result = await publishDiscoveryRows(rows);
      results.innerHTML = formatPublishResultHtml(result);
      if (result.published > 0) {
        const refreshed = await fetchAllEventsAdmin();
        existing.length = 0;
        existing.push(...refreshed.filter((e) => e.archived !== true));
      }
    } catch (error) {
      results.innerHTML = `<p class="error">${escapeHtml((error as Error).message)}</p>`;
    }
  }

  private async renderSources(panel: HTMLElement): Promise<void> {
    const sources = await fetchSources();

    panel.innerHTML = `
      <h2>Gestione fonti</h2>
      <form id="newSourceForm" class="source-form">
        <input name="name" placeholder="Nome fonte" required />
        <input name="url" type="url" placeholder="https://..." />
        <select name="acquisition_mode">
          <option value="manual">Manuale</option>
          <option value="assisted">Assistita</option>
          <option value="automatic">Automatica</option>
          <option value="api">API</option>
        </select>
        <select name="reliability">
          <option value="A">Affidabilità A</option>
          <option value="B" selected>Affidabilità B</option>
          <option value="C">Affidabilità C</option>
        </select>
        <button type="submit" class="primary">Aggiungi fonte</button>
      </form>
      <div id="sourcesList"></div>
    `;

    const list = panel.querySelector("#sourcesList") as HTMLElement;
    if (sources.length === 0) {
      list.innerHTML = "<p>Nessuna fonte.</p>";
      return;
    }

    list.innerHTML = sources
      .map(
        (s) => `
      <article class="source-item" data-id="${escapeHtml(s.id)}">
        <strong>${escapeHtml(s.name)}</strong>
        <div class="small">${escapeHtml(s.source_type)} · ${escapeHtml(s.acquisition_mode)} · Affidabilità ${s.reliability}</div>
        <div class="small">${s.url ? `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.url)}</a>` : "—"}</div>
        <div class="small">Stato: ${escapeHtml(s.status)} · Sync: ${s.last_sync_at ? formatDate(s.last_sync_at) : "mai"}</div>
        <div class="row-actions">
          <button type="button" class="toggle-status" data-status="${s.status === "active" ? "inactive" : "active"}">
            ${s.status === "active" ? "Disattiva" : "Attiva"}
          </button>
        </div>
      </article>
    `,
      )
      .join("");

    panel.querySelector("#newSourceForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      void this.handleNewSource(e.target as HTMLFormElement);
    });

    list.querySelectorAll(".toggle-status").forEach((btn) => {
      btn.addEventListener("click", () => {
        const article = (btn as HTMLElement).closest(".source-item") as HTMLElement;
        const id = article.dataset.id!;
        const status = (btn as HTMLButtonElement).dataset.status as "active" | "inactive";
        void updateSource(id, { status }).then(() => this.renderPanel());
      });
    });
  }

  private async handleNewSource(form: HTMLFormElement): Promise<void> {
    const data = new FormData(form);
    const input: SourceInput = {
      name: String(data.get("name")),
      url: String(data.get("url") || "") || null,
      source_type: "other",
      territory_id: "IT-VT",
      acquisition_mode: data.get("acquisition_mode") as SourceInput["acquisition_mode"],
      reliability: data.get("reliability") as SourceInput["reliability"],
    };
    await createSource(input);
    form.reset();
    await this.renderPanel();
  }

  private async renderEvents(panel: HTMLElement): Promise<void> {
    const pending = await fetchPendingEvents();
    panel.innerHTML = `<h2>Eventi in revisione</h2><div id="eventsList"></div>`;
    const list = panel.querySelector("#eventsList") as HTMLElement;
    this.renderEventCards(list, pending);
  }

  private renderEventCards(list: HTMLElement, events: AtlasEvent[]): void {
    if (events.length === 0) {
      list.innerHTML = "<p>Nessun evento in revisione.</p>";
      return;
    }

    list.innerHTML = "";
    for (const event of events) {
      const meta = getCategoryMeta(event.category);
      const div = document.createElement("div");
      div.className = "event";
      div.innerHTML = `
        <strong>${escapeHtml(event.title)}</strong>
        <div class="small">${meta.label} · ${formatDate(event.start_date)}</div>
        <div class="small">${escapeHtml(event.venue ?? "")}</div>
        <button class="approve" type="button">Approva</button>
        <button class="reject" type="button">Rifiuta</button>
      `;
      div.querySelector(".approve")?.addEventListener("click", () => {
        void updateEventReview(event.date_event!, true, "approved").then(() => this.renderPanel());
      });
      div.querySelector(".reject")?.addEventListener("click", () => {
        void updateEventReview(event.date_event!, false, "rejected").then(() => this.renderPanel());
      });
      list.appendChild(div);
    }
  }

  private async renderSubmissions(panel: HTMLElement): Promise<void> {
    const submissions = await fetchPendingSubmissions();
    panel.innerHTML = `<h2>Segnalazioni utenti</h2><p class="small">Ogni segnalazione ha un codice riferimento per tracciabilità (WhatsApp).</p><div id="submissionsList"></div>`;
    const list = panel.querySelector("#submissionsList") as HTMLElement;

    if (submissions.length === 0) {
      list.innerHTML = "<p>Nessuna segnalazione in attesa.</p>";
      return;
    }

    list.innerHTML = "";
    for (const sub of submissions) {
      const meta = getCategoryMeta(sub.category);
      const div = document.createElement("div");
      div.className = "event";
      div.innerHTML = `
        <strong>${escapeHtml(sub.title)}</strong>
        <div class="small">${sub.submission_kind === "correction" ? "✏️ Miglioramento" : "＋ Nuovo evento"} · Rif. <code>${escapeHtml(sub.reference_code ?? "—")}</code> · ${formatDate(sub.created_at ?? sub.start_date)}</div>
        <div class="small">${meta.label} · ${formatDate(sub.start_date)}</div>
        <div class="small">${escapeHtml(sub.venue ?? "")}</div>
        ${sub.related_event_id ? `<div class="small">Evento collegato: <code>${escapeHtml(sub.related_event_id)}</code></div>` : ""}
        <div class="small">Contatto: ${escapeHtml(sub.contact)} · ${escapeHtml(formatSubmissionContactLabel(sub.contact_type))}</div>
        ${sub.event_url ? `<div class="small"><a href="${escapeHtml(sub.event_url)}" target="_blank" rel="noopener">Link evento</a></div>` : ""}
        <button class="approve" type="button">Approva e pubblica</button>
        <button class="reject" type="button">Rifiuta</button>
        <button class="duplicate" type="button">Duplicato</button>
      `;

      div.querySelector(".approve")?.addEventListener("click", () => {
        void approveSubmissionAsEvent(sub).then(() => this.renderPanel());
      });
      div.querySelector(".reject")?.addEventListener("click", () => {
        void updateSubmissionStatus(sub.id, "rejected", "Rifiutata da revisore").then(() =>
          this.renderPanel(),
        );
      });
      div.querySelector(".duplicate")?.addEventListener("click", () => {
        void updateSubmissionStatus(sub.id, "duplicate", "Già presente su Atlas").then(() =>
          this.renderPanel(),
        );
      });

      list.appendChild(div);
    }
  }
}
