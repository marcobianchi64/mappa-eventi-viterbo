import {
  DATE_RANGE_LABELS,
  getEditionTerritoryLabel,
  DEFAULT_DATE_RANGE,
  injectAtlasTypography,
  validateSubmissionContact,
  type SubmissionContactChannel,
  escapeHtml,
  eventsLookSimilar,
  getDisplayCategory,
  formatEventSchedule,
  buildMapMarkerPlacements,
  filterEventsWithinRadiusKm,
  getCategoryMeta,
  getNearRadiusOption,
  isEventVisibleInRange,
  loadNearRadiusPreset,
  normalizeSearchText,
  saveNearRadiusPreset,
  reminderText,
  searchableEventText,
  generateSubmissionReference,
  buildSubmissionWhatsAppUrl,
  assessEventLocation,
  geocodeEventPlace,
  type SubmissionKind,
  type AtlasEvent,
  type DateRangeKey,
  type FestivalMapGroup,
  type EventCategory,
  type EventSubmissionInput,
  type NearRadiusPreset,
  type SavedInterest,
} from "@atlas/core";
import { fetchVerifiedEvents, submitUserReport } from "@atlas/supabase-client";
import { MapService } from "./map/map-service";
import { InterestsService } from "./services/interests";
import { closeEventSheet, openEventSheet, openFestivalEventSheet, setEventSheetOnClose, shareEvent } from "./ui/event-sheet";
import { renderShell } from "./ui/shell";
import {
  bindEventListPage,
  renderEventListPageHtml,
  type EventListCategoryFilter,
} from "./ui/event-list";
import { setStatus, showToast } from "./ui/toast";

interface FormValues {
  title: string;
  category: EventCategory;
  startDate: string;
  endDate: string;
  venue: string;
  eventUrl: string;
  imageUrl: string;
  description: string;
  contact: string;
  contactChannel: SubmissionContactChannel;
  lat: number;
  lng: number;
  submissionKind: SubmissionKind;
  relatedEventId: string;
}

type AppViewMode = "map" | "list";

export class AtlasApp {
  private allEvents: AtlasEvent[] = [];
  private currentRange: DateRangeKey = DEFAULT_DATE_RANGE;
  private viewMode: AppViewMode = "map";
  private locationRequestRunning = false;
  private initialMapFitDone = false;
  private nearRadiusPreset: NearRadiusPreset = loadNearRadiusPreset();
  private lastUserPosition: { lat: number; lng: number } | null = null;
  private listCategory: EventListCategoryFilter = "all";
  private insertMapPickActive = false;
  private insertLocationFromMap = false;
  private readonly interests = new InterestsService();
  private mapService!: MapService;

  start(): void {
    const root = document.getElementById("app");
    if (!root) throw new Error("Elemento #app non trovato");
    root.innerHTML = renderShell();

    this.mapService = new MapService(
      (lat: number, lng: number) => this.setDraftPosition(lat, lng),
      (event: AtlasEvent, festivalGroup?: FestivalMapGroup) =>
        this.handleOpenEvent(event, festivalGroup),
    );

    this.bindEvents();
    this.syncNearRadiusUi();
    this.syncCategoryFilterUi();
    this.syncFilterOptionActiveStates();
    this.updateActiveFiltersBar();
    this.renderPrograms();
    injectAtlasTypography();
    setEventSheetOnClose(() => this.syncEventUrlParam(null));
    this.applyViewFromUrl();
    void this.loadEvents();
    this.restoreTopbar();
  }

  private handleOpenEvent(event: AtlasEvent, festivalGroup?: FestivalMapGroup): void {
    if (festivalGroup && festivalGroup.events.length > 1) {
      openFestivalEventSheet(
        festivalGroup,
        (selected) => this.handleOpenEvent(selected),
        showToast,
      );
      return;
    }
    this.syncEventUrlParam(event.date_event ?? null);
    openEventSheet(
      event,
      (e: AtlasEvent) => {
        this.interests.save(e);
        this.renderPrograms();
      },
      shareEvent,
      showToast,
      (e) => this.openInsertForCorrection(e),
    );
  }

  private bindEvents(): void {
    const filterMenuWrap = document.getElementById("filterMenuWrap");
    const filterEventsButton = document.getElementById("filterEventsButton");
    const filterEventsPanel = document.getElementById("filterEventsPanel");

    filterEventsButton?.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = filterMenuWrap?.classList.toggle("open");
      filterEventsButton.setAttribute("aria-expanded", open ? "true" : "false");
      filterEventsPanel?.setAttribute("aria-hidden", open ? "false" : "true");
      document.getElementById("programsPanel")?.classList.remove("open");
      this.closeDockFlyouts();
    });

    filterMenuWrap?.addEventListener("mouseenter", () => {
      if (window.matchMedia("(hover: hover)").matches) {
        filterMenuWrap.classList.add("open");
        filterEventsButton?.setAttribute("aria-expanded", "true");
        filterEventsPanel?.setAttribute("aria-hidden", "false");
      }
    });

    filterMenuWrap?.addEventListener("mouseleave", () => {
      if (window.matchMedia("(hover: hover)").matches) {
        filterMenuWrap.classList.remove("open");
        filterEventsButton?.setAttribute("aria-expanded", "false");
        filterEventsPanel?.setAttribute("aria-hidden", "true");
      }
    });

    document.addEventListener("click", (e) => {
      if (!filterMenuWrap?.contains(e.target as Node)) {
        filterMenuWrap?.classList.remove("open");
        filterEventsButton?.setAttribute("aria-expanded", "false");
        filterEventsPanel?.setAttribute("aria-hidden", "true");
      }
    });

    document.getElementById("viewMapBtn")?.addEventListener("click", () => this.setViewMode("map"));
    document.getElementById("viewListBtn")?.addEventListener("click", () => this.setViewMode("list"));

    document.getElementById("programsButton")?.addEventListener("click", () => {
      this.closeFilterMenu();
      this.closeDockFlyouts();
      this.renderPrograms();
      document.getElementById("programsPanel")?.classList.toggle("open");
    });

    document.getElementById("topInsertBtn")?.addEventListener("click", () => {
      this.toggleDockFlyout("insert");
    });
    document.getElementById("closeInsertFlyout")?.addEventListener("click", () => {
      this.closeDockFlyouts();
    });

    this.bindInsertFormControls();

    document.querySelectorAll(".filter-when-option").forEach((button) => {
      button.addEventListener("click", () => {
        this.currentRange = (button as HTMLButtonElement).dataset.range as DateRangeKey;
        this.syncFilterOptionActiveStates();
        this.updateActiveFiltersBar();
        this.renderMapEvents();
        this.renderEventList();
        this.closeFilterMenu();
      });
    });

    document.querySelectorAll(".filter-category-option").forEach((button) => {
      button.addEventListener("click", () => {
        const category = (button as HTMLButtonElement).dataset.category as EventListCategoryFilter;
        if (!category) return;
        this.setCategoryFilter(category);
        this.closeFilterMenu();
      });
    });

    document.getElementById("searchPlaceButton")?.addEventListener("click", () => this.searchPlace("searchPlace"));
    document.getElementById("searchPlaceButtonMobile")?.addEventListener("click", () => this.searchPlace("searchPlaceMobile"));
    document.getElementById("searchPlace")?.addEventListener("keydown", (e) => {
      if ((e as KeyboardEvent).key === "Enter") this.searchPlace("searchPlace");
    });
    document.getElementById("searchPlaceMobile")?.addEventListener("keydown", (e) => {
      if ((e as KeyboardEvent).key === "Enter") this.searchPlace("searchPlaceMobile");
    });

    document.getElementById("saveButton")?.addEventListener("click", () => void this.addEvent("desktop"));
    document.getElementById("saveButtonMobile")?.addEventListener("click", () => void this.addEvent("mobile"));

    document.getElementById("openFilterMobile")?.addEventListener("click", () => {
      this.openMobileSheet("filter");
    });

    document.getElementById("openInsertMobile")?.addEventListener("click", () => {
      closeEventSheet();
      this.openMobileSheet("insert");
      this.beginInsertMapPick();
    });

    document.getElementById("closeSheet")?.addEventListener("click", () => {
      document.getElementById("mobileSheet")?.classList.remove("open");
    });

    document.getElementById("stableEventOverlay")?.addEventListener("click", closeEventSheet);
    document.getElementById("nearMeButtonDock")?.addEventListener("click", () => this.goNearMe());
    document.getElementById("nearMeButtonMobile")?.addEventListener("click", () => this.goNearMe());

    document.querySelectorAll("[data-near-radius]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const preset = (btn as HTMLButtonElement).dataset.nearRadius as NearRadiusPreset;
        if (preset !== "city" && preset !== "province") return;
        this.nearRadiusPreset = preset;
        saveNearRadiusPreset(preset);
        this.syncNearRadiusUi();
        if (this.lastUserPosition) {
          this.applyNearMe(this.lastUserPosition.lat, this.lastUserPosition.lng, false);
        }
      });
    });

    window.addEventListener("pageshow", () => this.restoreTopbar());
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        this.restoreTopbar();
        setTimeout(() => this.mapService.invalidateSize(), 100);
      }
    });

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    window.addEventListener("resize", () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        injectAtlasTypography();
        this.updateActiveFiltersBar();
        this.renderMapEvents();
      }, 150);
    });
  }

  private applyViewFromUrl(): void {
    const view = new URL(window.location.href).searchParams.get("view");
    if (view === "list") this.setViewMode("list", { skipUrl: true });
  }

  private syncViewUrlParam(): void {
    const url = new URL(window.location.href);
    if (this.viewMode === "list") url.searchParams.set("view", "list");
    else url.searchParams.delete("view");
    const next = url.search ? `${url.pathname}${url.search}` : url.pathname;
    history.replaceState(null, "", next);
  }

  private setViewMode(mode: AppViewMode, options?: { skipUrl?: boolean }): void {
    this.viewMode = mode;
    document.body.classList.toggle("atlas-view-list", mode === "list");

    const listPage = document.getElementById("listPage");
    if (listPage) listPage.hidden = mode !== "list";

    document.getElementById("viewMapBtn")?.classList.toggle("active", mode === "map");
    document.getElementById("viewListBtn")?.classList.toggle("active", mode === "list");

    document.getElementById("programsPanel")?.classList.remove("open");
    this.closeFilterMenu();
    this.closeDockFlyouts();

    if (!options?.skipUrl) this.syncViewUrlParam();

    if (mode === "list") {
      this.renderEventList();
      listPage?.scrollTo(0, 0);
    } else {
      setTimeout(() => this.mapService.invalidateSize(), 80);
      this.renderMapEvents();
    }
    this.updateActiveFiltersBar();
  }

  private syncFilterOptionActiveStates(): void {
    document.querySelectorAll(".filter-when-option").forEach((b) => {
      const range = (b as HTMLButtonElement).dataset.range;
      b.classList.toggle("active", range === this.currentRange);
    });
  }

  /** Aggiorna ?event= senza cambiare pagina (resta sulla mappa). */
  private syncEventUrlParam(eventId: string | null): void {
    const url = new URL(window.location.href);
    if (eventId) url.searchParams.set("event", String(eventId));
    else url.searchParams.delete("event");
    if (this.viewMode === "list") url.searchParams.set("view", "list");
    const next = url.search ? `${url.pathname}${url.search}` : url.pathname;
    history.replaceState(null, "", next);
  }

  private async loadEvents(): Promise<void> {
    try {
      this.allEvents = (await fetchVerifiedEvents()).map((event) => {
        const a = assessEventLocation(event);
        return { ...event, lat: a.lat, lng: a.lng };
      });
      if (this.viewMode === "list") this.renderEventList();
      else this.renderMapEvents();
    } catch (error) {
      console.error(error);
      showToast("Impossibile caricare gli eventi.");
    }
  }

  private getVisibleEvents(): AtlasEvent[] {
    return this.allEvents.filter((event) => isEventVisibleInRange(event, this.currentRange));
  }

  private getFilteredEvents(): AtlasEvent[] {
    let events = this.getVisibleEvents();
    if (this.listCategory !== "all") {
      events = events.filter((event) => getDisplayCategory(event) === this.listCategory);
    }
    return events;
  }

  private getListEvents(): AtlasEvent[] {
    return this.getFilteredEvents().sort(
      (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
    );
  }

  private renderEventList(): void {
    const root = document.getElementById("eventListContent");
    if (!root) return;
    root.innerHTML = renderEventListPageHtml(
      this.getListEvents(),
      this.listCategory,
      this.currentRange,
    );
    bindEventListPage(root, (eventId) => {
      const event = this.allEvents.find((e) => String(e.date_event) === eventId);
      if (!event) return;
      this.handleOpenEvent(event);
    });
  }

  private renderMapEvents(): void {
    const deepLink = new URLSearchParams(window.location.search).get("event");
    const visible = this.getFilteredEvents();
    this.mapService.renderEvents(visible, deepLink);

    if (!deepLink && !this.initialMapFitDone && visible.length > 0) {
      const coords = buildMapMarkerPlacements(visible).map(
        (p) => [p.lat, p.lng] as [number, number],
      );
      this.mapService.fitToCoordinates(coords);
      this.initialMapFitDone = true;
    }
  }

  private setCategoryFilter(category: EventListCategoryFilter): void {
    this.listCategory = category;
    this.syncCategoryFilterUi();
    this.updateActiveFiltersBar();
    this.renderMapEvents();
    this.renderEventList();
  }

  private syncCategoryFilterUi(): void {
    document.querySelectorAll(".filter-category-option").forEach((btn) => {
      const cat = (btn as HTMLButtonElement).dataset.category;
      const active = cat === this.listCategory;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  private closeFilterMenu(): void {
    document.getElementById("filterMenuWrap")?.classList.remove("open");
    document.getElementById("filterEventsButton")?.setAttribute("aria-expanded", "false");
    document.getElementById("filterEventsPanel")?.setAttribute("aria-hidden", "true");
  }

  private toggleDockFlyout(which: "insert"): void {
    const insert = document.getElementById("dockInsertFlyout");
    const insertBtn = document.getElementById("topInsertBtn");
    document.getElementById("programsPanel")?.classList.remove("open");
    this.closeFilterMenu();

    const insertOpen = which === "insert" && !insert?.classList.contains("open");

    if (insertOpen) {
      closeEventSheet();
      this.beginInsertMapPick();
    } else {
      this.resetInsertPickState();
    }

    insert?.classList.toggle("open", insertOpen);
    insert?.setAttribute("aria-hidden", insertOpen ? "false" : "true");
    insertBtn?.classList.toggle("active", insertOpen);
  }

  private closeDockFlyouts(): void {
    const insert = document.getElementById("dockInsertFlyout");
    insert?.classList.remove("open");
    insert?.setAttribute("aria-hidden", "true");
    document.getElementById("topInsertBtn")?.classList.remove("active");
    this.resetInsertPickState();
  }

  private isInsertFormOpen(): boolean {
    const flyoutOpen = document.getElementById("dockInsertFlyout")?.classList.contains("open");
    const mobileInsert = document.getElementById("mobileInsertPanel");
    const mobileOpen =
      document.getElementById("mobileSheet")?.classList.contains("open") &&
      mobileInsert &&
      !mobileInsert.classList.contains("hidden");
    return Boolean(flyoutOpen || mobileOpen);
  }

  private beginInsertMapPick(): void {
    this.insertMapPickActive = true;
    this.updateInsertLocationStatus("desktop");
    this.updateInsertLocationStatus("mobile");
    setStatus("Tocca la mappa per indicare la posizione.", "success");
  }

  private resetInsertPickState(): void {
    this.insertMapPickActive = false;
    this.insertLocationFromMap = false;
  }

  private bindInsertFormControls(): void {
    document.querySelectorAll(".submission-kind-input").forEach((input) => {
      input.addEventListener("change", () => this.syncInsertFormModeUi());
    });
    document.querySelectorAll(".contact-channel-input").forEach((input) => {
      input.addEventListener("change", () => {
        this.syncContactFieldUi("desktop");
        this.syncContactFieldUi("mobile");
      });
    });
    document.getElementById("pickMapLocation")?.addEventListener("click", () => this.beginInsertMapPick());
    document.getElementById("pickMapLocationMobile")?.addEventListener("click", () => this.beginInsertMapPick());
    ["venue", "venueMobile"].forEach((id) => {
      document.getElementById(id)?.addEventListener("input", () => {
        this.updateInsertLocationStatus(id.endsWith("Mobile") ? "mobile" : "desktop");
      });
    });
    this.syncContactFieldUi("desktop");
    this.syncContactFieldUi("mobile");
  }

  private getContactChannel(source: "desktop" | "mobile"): SubmissionContactChannel {
    const name = source === "mobile" ? "contactChannelMobile" : "contactChannel";
    const checked = document.querySelector(`input[name="${name}"]:checked`) as HTMLInputElement | null;
    return checked?.value === "whatsapp" ? "whatsapp" : "email";
  }

  private syncContactFieldUi(source: "desktop" | "mobile"): void {
    const suffix = source === "mobile" ? "Mobile" : "";
    const channel = this.getContactChannel(source);
    const input = document.getElementById(`contact${suffix}`) as HTMLInputElement | null;
    if (!input) return;
    if (channel === "email") {
      input.type = "email";
      input.inputMode = "email";
      input.autocomplete = "email";
      input.placeholder = "nome@esempio.it";
    } else {
      input.type = "tel";
      input.inputMode = "tel";
      input.autocomplete = "tel";
      input.placeholder = "Es. 393331234567";
    }
  }

  private syncInsertFormModeUi(): void {
    const isCorrection = this.getSubmissionKind("desktop") === "correction";
    document.querySelectorAll(".insert-form-root").forEach((root) => {
      root.classList.toggle("insert-form-correction", isCorrection);
    });
    const title = document.getElementById("insertFlyoutTitle");
    const mobileTitle = document.getElementById("insertMobileTitle");
    const heading = isCorrection ? "Migliora un evento" : "Segnala un evento";
    if (title) title.textContent = heading;
    if (mobileTitle) mobileTitle.textContent = heading;
    (["", "Mobile"] as const).forEach((suffix) => {
      const label = document.getElementById(`descriptionLabel${suffix}`);
      const textarea = document.getElementById(`description${suffix}`) as HTMLTextAreaElement | null;
      if (label) {
        label.textContent = isCorrection
          ? "Cosa vuoi correggere o aggiungere? *"
          : "Breve descrizione (facoltativa)";
      }
      if (textarea) {
        textarea.placeholder = isCorrection
          ? "Es. foto ufficiale, orario esatto, link aggiornato, indirizzo preciso…"
          : "Informazioni utili sull'evento";
      }
    });
  }

  private updateInsertLocationStatus(source: "desktop" | "mobile"): void {
    const suffix = source === "mobile" ? "Mobile" : "";
    const el = document.getElementById(`insertLocationStatus${suffix}`);
    if (!el) return;
    const lat = Number((document.getElementById(`lat${suffix}`) as HTMLInputElement | null)?.value);
    const lng = Number((document.getElementById(`lng${suffix}`) as HTMLInputElement | null)?.value);
    const venue = (document.getElementById(`venue${suffix}`) as HTMLInputElement | null)?.value.trim();
    if (this.insertMapPickActive) {
      el.textContent = "Modalità attiva: tocca un punto sulla mappa.";
      el.className = "insert-location-status is-picking";
      return;
    }
    if (this.insertLocationFromMap && Number.isFinite(lat) && Number.isFinite(lng)) {
      el.textContent = `Posizione selezionata sulla mappa (${lat.toFixed(4)}, ${lng.toFixed(4)}).`;
      el.className = "insert-location-status is-set";
      return;
    }
    if (venue) {
      el.textContent = "Useremo l'indirizzo scritto per stimare la posizione sulla mappa.";
      el.className = "insert-location-status is-address";
      return;
    }
    el.textContent = "Indica il punto sulla mappa oppure scrivi un indirizzo preciso.";
    el.className = "insert-location-status";
  }

  private openInsertForCorrection(event: AtlasEvent): void {
    if (this.viewMode !== "map") this.setViewMode("map");
    closeEventSheet();
    this.syncEventUrlParam(null);
    this.prefillInsertFromEvent(event, "correction");
    const insert = document.getElementById("dockInsertFlyout");
    const insertBtn = document.getElementById("topInsertBtn");
    insert?.classList.add("open");
    insert?.setAttribute("aria-hidden", "false");
    insertBtn?.classList.add("active");
    this.insertMapPickActive = false;
    this.insertLocationFromMap = true;
    this.updateInsertLocationStatus("desktop");
    this.updateInsertLocationStatus("mobile");
    setStatus("Compila solo i campi da migliorare e invia la segnalazione.", "success");
  }

  private prefillInsertFromEvent(event: AtlasEvent, mode: SubmissionKind): void {
    const toLocalInput = (iso?: string | null) => {
      if (!iso) return "";
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "";
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    (["", "Mobile"] as const).forEach((suffix) => {
      const set = (id: string, value: string) => {
        const el = document.getElementById(`${id}${suffix}`) as HTMLInputElement | HTMLTextAreaElement | null;
        if (el) el.value = value;
      };
      set("title", event.title ?? "");
      set("venue", event.venue ?? "");
      set("event_url", event.event_url ?? "");
      set("image_url", event.image_url ?? "");
      set("start_date", toLocalInput(event.start_date));
      set("end_date", toLocalInput(event.end_date));
      set("lat", String(event.lat ?? ""));
      set("lng", String(event.lng ?? ""));
      set("related_event_id", event.date_event ? String(event.date_event) : "");
      const category = document.getElementById(`category${suffix}`) as HTMLSelectElement | null;
      if (category) category.value = getDisplayCategory(event);
      const kindName = `submissionKind${suffix}`;
      document
        .querySelectorAll(`input[name="${kindName}"]`)
        .forEach((input) => {
          (input as HTMLInputElement).checked = (input as HTMLInputElement).value === mode;
        });
    });
    this.syncInsertFormModeUi();
  }

  private getSubmissionKind(source: "desktop" | "mobile"): SubmissionKind {
    const name = source === "mobile" ? "submissionKindMobile" : "submissionKind";
    const checked = document.querySelector(`input[name="${name}"]:checked`) as HTMLInputElement | null;
    return checked?.value === "correction" ? "correction" : "new";
  }

  private resolveSubmissionCoordinates(
    form: FormValues,
  ): { lat: number; lng: number; source: "map" | "address" | "existing" } | null {
    if (this.insertLocationFromMap && Number.isFinite(form.lat) && Number.isFinite(form.lng)) {
      return { lat: form.lat, lng: form.lng, source: "map" };
    }
    if (form.venue.trim()) {
      const place = geocodeEventPlace({ venue: form.venue, title: form.title });
      return { lat: place.lat, lng: place.lng, source: "address" };
    }
    if (form.submissionKind === "correction" && form.relatedEventId) {
      const existing = this.allEvents.find((e) => String(e.date_event ?? "") === form.relatedEventId);
      if (existing && Number.isFinite(existing.lat) && Number.isFinite(existing.lng)) {
        return { lat: existing.lat, lng: existing.lng, source: "existing" };
      }
    }
    return null;
  }

  private updateActiveFiltersBar(): void {
    const el = document.getElementById("activeFiltersBar");
    if (!el) return;
    const category =
      this.listCategory === "all"
        ? "tutti gli eventi"
        : getCategoryMeta(this.listCategory).label.toLowerCase();
    const time = DATE_RANGE_LABELS[this.currentRange] ?? "15 giorni";
    const territory = getEditionTerritoryLabel();
    el.textContent = `${territory} · ${category} · ${time}`;
    this.syncHeaderLayout();
  }

  private syncHeaderLayout(): void {
    const header = document.querySelector(".atlas-header");
    if (!header) return;
    const height = header.getBoundingClientRect().height;
    document.documentElement.style.setProperty("--atlas-header-stack", `${Math.ceil(height)}px`);
  }

  private openMobileSheet(which: "filter" | "insert"): void {
    const sheet = document.getElementById("mobileSheet");
    const filterPanel = document.getElementById("mobileFilterPanel");
    const insertPanel = document.getElementById("mobileInsertPanel");
    sheet?.classList.add("open");
    filterPanel?.classList.toggle("hidden", which !== "filter");
    insertPanel?.classList.toggle("hidden", which !== "insert");
  }

  private setDraftPosition(lat: number, lng: number): void {
    if (!this.isInsertFormOpen() || !this.insertMapPickActive) return;

    ["lat", "latMobile"].forEach((id) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) el.value = lat.toFixed(6);
    });
    ["lng", "lngMobile"].forEach((id) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) el.value = lng.toFixed(6);
    });
    this.insertLocationFromMap = true;
    this.insertMapPickActive = false;
    this.mapService.setDraftPosition(lat, lng);
    this.updateInsertLocationStatus("desktop");
    this.updateInsertLocationStatus("mobile");
    setStatus("Posizione registrata sulla mappa.", "success");
  }

  private syncFormValues(source: "desktop" | "mobile"): FormValues {
    const suffix = source === "mobile" ? "Mobile" : "";
    return {
      title: (document.getElementById(`title${suffix}`) as HTMLInputElement).value.trim(),
      category: (document.getElementById(`category${suffix}`) as HTMLSelectElement).value as EventCategory,
      startDate: (document.getElementById(`start_date${suffix}`) as HTMLInputElement).value,
      endDate: (document.getElementById(`end_date${suffix}`) as HTMLInputElement).value,
      venue: (document.getElementById(`venue${suffix}`) as HTMLInputElement).value.trim(),
      eventUrl: (document.getElementById(`event_url${suffix}`) as HTMLInputElement).value.trim(),
      imageUrl: (document.getElementById(`image_url${suffix}`) as HTMLInputElement).value.trim(),
      description: (document.getElementById(`description${suffix}`) as HTMLTextAreaElement).value.trim(),
      contact: (document.getElementById(`contact${suffix}`) as HTMLInputElement).value.trim(),
      contactChannel: this.getContactChannel(source),
      lat: Number((document.getElementById(`lat${suffix}`) as HTMLInputElement).value),
      lng: Number((document.getElementById(`lng${suffix}`) as HTMLInputElement).value),
      submissionKind: this.getSubmissionKind(source),
      relatedEventId: (document.getElementById(`related_event_id${suffix}`) as HTMLInputElement).value.trim(),
    };
  }

  private clearForm(source: "desktop" | "mobile"): void {
    const suffix = source === "mobile" ? "Mobile" : "";
    ["title", "start_date", "end_date", "venue", "event_url", "image_url", "description", "contact", "lat", "lng", "related_event_id"].forEach((id) => {
      const el = document.getElementById(`${id}${suffix}`) as HTMLInputElement | HTMLTextAreaElement | null;
      if (el) el.value = "";
    });
    const kindName = `submissionKind${suffix}`;
    const newRadio = document.querySelector(`input[name="${kindName}"][value="new"]`) as HTMLInputElement | null;
    if (newRadio) newRadio.checked = true;
    const contactChannelName = `contactChannel${suffix}`;
    const emailRadio = document.querySelector(
      `input[name="${contactChannelName}"][value="email"]`,
    ) as HTMLInputElement | null;
    if (emailRadio) emailRadio.checked = true;
    this.syncInsertFormModeUi();
    this.syncContactFieldUi(source === "mobile" ? "mobile" : "desktop");
    this.resetInsertPickState();
    this.updateInsertLocationStatus("desktop");
    this.updateInsertLocationStatus("mobile");
  }

  private async addEvent(source: "desktop" | "mobile"): Promise<void> {
    const button = document.getElementById(source === "mobile" ? "saveButtonMobile" : "saveButton") as HTMLButtonElement;
    const form = this.syncFormValues(source);
    const isCorrection = form.submissionKind === "correction";

    if (!form.title || !form.startDate) {
      setStatus("Inserisci almeno titolo e data di inizio.", "error");
      return;
    }

    const contactCheck = validateSubmissionContact(form.contact, form.contactChannel);
    if (!contactCheck.ok) {
      setStatus(contactCheck.message, "error");
      return;
    }

    if (isCorrection && !form.description) {
      setStatus("Per un miglioramento descrivi cosa vuoi correggere o aggiungere.", "error");
      return;
    }

    if (form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
      setStatus("La data di fine non può essere precedente alla data di inizio.", "error");
      return;
    }

    const coords = this.resolveSubmissionCoordinates(form);
    if (!coords) {
      setStatus("Indica la posizione sulla mappa oppure scrivi un indirizzo nel campo Luogo.", "error");
      return;
    }

    const candidate = {
      title: form.title,
      start_date: new Date(form.startDate).toISOString(),
      venue: form.venue,
      lat: coords.lat,
      lng: coords.lng,
    };

    let relatedEventId = form.relatedEventId || null;
    let submissionKind: SubmissionKind = form.submissionKind;

    if (!isCorrection) {
      const duplicate = this.allEvents.find((event) => eventsLookSimilar(candidate, event));
      if (duplicate) {
        const useCorrection = window.confirm(
          `«${duplicate.title}» sembra già presente su Atlas.\n\nVuoi inviare un suggerimento di miglioramento invece di creare un duplicato?`,
        );
        if (!useCorrection) {
          this.mapService.fitToCoordinates([[duplicate.lat, duplicate.lng]]);
          setTimeout(() => this.handleOpenEvent(duplicate), 300);
          return;
        }
        submissionKind = "correction";
        relatedEventId = duplicate.date_event ? String(duplicate.date_event) : relatedEventId;
        if (!form.description) {
          setStatus("Descrivi cosa vuoi migliorare dell'evento già presente.", "error");
          return;
        }
      }
    }

    const description =
      submissionKind === "correction"
        ? `[Miglioramento evento${relatedEventId ? ` ${relatedEventId}` : ""}]\n${form.description}`.trim()
        : form.description || null;

    const payload: EventSubmissionInput = {
      title: form.title,
      category: form.category,
      start_date: new Date(form.startDate).toISOString(),
      end_date: form.endDate ? new Date(form.endDate).toISOString() : null,
      venue: form.venue || null,
      event_url: form.eventUrl || null,
      image_url: form.imageUrl || null,
      description,
      lat: coords.lat,
      lng: coords.lng,
      contact: contactCheck.normalized,
      contact_type: contactCheck.contact_type,
      territory_id: "IT-VT",
      submission_kind: submissionKind,
      related_event_id: relatedEventId,
    };

    button.disabled = true;
    button.textContent = "Invio in corso...";
    setStatus("");

    try {
      const referenceCode = generateSubmissionReference();
      const opsWhatsApp = import.meta.env.VITE_ATLAS_OPS_WHATSAPP?.replace(/\D/g, "") ?? "";

      await submitUserReport({ ...payload, reference_code: referenceCode });

      const successMessage =
        submissionKind === "correction"
          ? "Suggerimento inviato: un revisore valuterà le modifiche proposte."
          : "Segnalazione inviata: verrà pubblicata se non già presente tra le fonti.";
      setStatus(successMessage, "success");

      if (opsWhatsApp) {
        const waUrl = buildSubmissionWhatsAppUrl(opsWhatsApp, {
          reference: referenceCode,
          title: form.title,
          startDate: new Date(form.startDate).toLocaleString("it-IT", {
            dateStyle: "medium",
            timeStyle: "short",
          }),
          venue: form.venue || null,
        });
        const confirm = window.confirm(
          `Segnalazione registrata (rif. ${referenceCode}).\n\nVuoi inviare la conferma su WhatsApp per tracciabilità?`,
        );
        if (confirm) window.open(waUrl, "_blank", "noopener");
      }

      this.clearForm(source);
      this.mapService.clearDraftMarker();
      this.closeDockFlyouts();
      document.getElementById("mobileSheet")?.classList.remove("open");
    } catch (error) {
      console.error(error);
      setStatus("Invio non riuscito. Riprova più tardi.", "error");
    } finally {
      button.disabled = false;
      button.textContent = "Invia segnalazione per revisione";
    }
  }

  private searchPlace(inputId: string): void {
    const input = document.getElementById(inputId) as HTMLInputElement;
    const query = normalizeSearchText(input.value);

    if (!query) {
      showToast("Scrivi il nome di un evento o di una località presente su Atlas.");
      return;
    }

    const activeEvents = this.getFilteredEvents();
    const matches = activeEvents
      .filter((event) => searchableEventText(event).includes(query))
      .sort((a, b) => this.searchScore(query, a) - this.searchScore(query, b));

    if (matches.length === 0) {
      showToast("Nessun evento o località attiva corrispondente.");
      return;
    }

    document.getElementById("mobileSheet")?.classList.remove("open");

    if (matches.length === 1) {
      const event = matches[0];
      this.mapService.fitToCoordinates([[event.lat, event.lng]]);
      setTimeout(() => this.handleOpenEvent(event), 220);
      return;
    }

    const coordinates = matches
      .filter((e) => Number.isFinite(Number(e.lat)) && Number.isFinite(Number(e.lng)))
      .map((e) => [e.lat, e.lng] as [number, number]);

    this.mapService.fitToCoordinates(coordinates);
    showToast(`${matches.length} eventi corrispondenti visibili sulla mappa.`);
  }

  private searchScore(query: string, event: AtlasEvent): number {
    const title = normalizeSearchText(event.title);
    const venue = normalizeSearchText(event.venue);
    if (title === query) return 0;
    if (title.startsWith(query)) return 1;
    if (venue === query) return 2;
    if (venue.startsWith(query)) return 3;
    return 4;
  }

  private renderPrograms(): void {
    const list = document.getElementById("programsList");
    const interests = this.interests.listSorted();
    const button = document.getElementById("programsButton");

    if (button) {
      const label = button.querySelector(".topbar-btn-label");
      const text = interests.length ? `Salvati (${interests.length})` : "Salvati";
      if (label) label.textContent = text;
      else button.textContent = interests.length ? `🔖 Salvati (${interests.length})` : "🔖 Salvati";
    }
    if (!list) return;

    if (interests.length === 0) {
      list.innerHTML = "Nessun evento salvato.";
      return;
    }

    list.innerHTML = interests
      .map(
        (item: SavedInterest) => `
        <div class="program-item">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(formatEventSchedule({ start_date: item.start_date ?? "", end_date: item.end_date }))}</span>
          ${item.venue ? `<span>${escapeHtml(item.venue)}</span>` : ""}
          <span>${reminderText(item.start_date)}</span>
          <button type="button" data-remove="${escapeHtml(item.id)}">Rimuovi</button>
        </div>
      `,
      )
      .join("");

    list.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = (btn as HTMLButtonElement).dataset.remove;
        if (id) {
          this.interests.remove(id);
          this.renderPrograms();
        }
      });
    });
  }

  private syncNearRadiusUi(): void {
    const opt = getNearRadiusOption(this.nearRadiusPreset);
    const hint = `${opt.hint}`;
    ["nearRadiusHintDock", "nearRadiusHintMobile"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = hint;
    });
    document.querySelectorAll("[data-near-radius]").forEach((btn) => {
      const preset = (btn as HTMLButtonElement).dataset.nearRadius;
      const active = preset === this.nearRadiusPreset;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
    const label = `📍 Cerca vicino a me (${opt.shortLabel})`;
    ["nearMeButtonDock", "nearMeButtonMobile"].forEach((id) => {
      const button = document.getElementById(id) as HTMLButtonElement | null;
      if (button && !button.disabled) button.textContent = label;
    });
  }

  private setLocationButtonsBusy(isBusy: boolean): void {
    const opt = getNearRadiusOption(this.nearRadiusPreset);
    const label = isBusy ? "📍 Cerco vicino a te..." : `📍 Cerca vicino a me (${opt.shortLabel})`;
    ["nearMeButtonDock", "nearMeButtonMobile"].forEach((id) => {
      const button = document.getElementById(id) as HTMLButtonElement | null;
      if (!button) return;
      button.disabled = isBusy;
      button.textContent = label;
    });
  }

  private applyNearMe(lat: number, lng: number, closePanels: boolean): void {
    const opt = getNearRadiusOption(this.nearRadiusPreset);
    const nearby = filterEventsWithinRadiusKm(this.getFilteredEvents(), lat, lng, opt.radiusKm);

    if (closePanels) {
      document.getElementById("mobileSheet")?.classList.remove("open");
      this.closeDockFlyouts();
    }

    this.mapService.flyToUser(lat, lng, opt.radiusKm);

    if (nearby.length === 0) {
      showToast(
        `Nessun evento nel periodo scelto entro ${opt.shortLabel}. Prova «In provincia» o allarga «Cerca entro».`,
      );
      return;
    }

    const coords = buildMapMarkerPlacements(nearby).map(
      (p) => [p.lat, p.lng] as [number, number],
    );
    this.mapService.fitBoundsWithUserAndEvents(lat, lng, coords, opt.radiusKm);

    if (nearby.length === 1) {
      showToast(`1 evento entro ${opt.shortLabel} da te.`);
      setTimeout(() => this.handleOpenEvent(nearby[0]), 400);
      return;
    }

    showToast(`${nearby.length} eventi entro ${opt.shortLabel} da te.`);
  }

  private goNearMe(): void {
    if (this.locationRequestRunning) return;

    if (!navigator.geolocation) {
      showToast("Questo browser non supporta la posizione.");
      return;
    }

    if (!window.isSecureContext) {
      showToast("Apri Atlas dalla pagina HTTPS pubblicata.");
      return;
    }

    this.locationRequestRunning = true;
    this.setLocationButtonsBusy(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.locationRequestRunning = false;
        this.setLocationButtonsBusy(false);

        const lat = Number(position.coords.latitude);
        const lng = Number(position.coords.longitude);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          showToast("Il dispositivo non ha restituito una posizione valida.");
          return;
        }

        this.lastUserPosition = { lat, lng };
        this.applyNearMe(lat, lng, true);
      },
      (error) => {
        this.locationRequestRunning = false;
        this.setLocationButtonsBusy(false);

        let message = "Non è stato possibile rilevare la posizione.";
        if (error?.code === 1) {
          message = "La posizione è bloccata. Consenti la posizione al sito e riprova.";
        } else if (error?.code === 2) {
          message = "Posizione non disponibile. Attiva la localizzazione e riprova.";
        } else if (error?.code === 3) {
          message = "Il rilevamento ha impiegato troppo tempo. Riprova.";
        }

        showToast(message);
        console.error("Errore geolocalizzazione:", error);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  }

  private restoreTopbar(): void {
    const header = document.querySelector(".atlas-header") as HTMLElement | null;
    if (!header) return;
    header.style.display = "block";
    header.style.visibility = "visible";
    header.style.opacity = "1";
    this.syncHeaderLayout();
  }
}
