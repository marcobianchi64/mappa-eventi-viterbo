import {
  ATLAS_VERSION,
  DATE_RANGE_LABELS,
  DEFAULT_DATE_RANGE,
  applyMapUiScale,
  detectContactType,
  escapeHtml,
  eventsLookSimilar,
  formatDate,
  buildMapMarkerPlacements,
  hasValidEventCoords,
  isEventVisibleInRange,
  normalizeSearchText,
  reminderText,
  searchableEventText,
  generateSubmissionReference,
  buildSubmissionWhatsAppUrl,
  type AtlasEvent,
  type DateRangeKey,
  type EventCategory,
  type EventSubmissionInput,
  type SavedInterest,
} from "@atlas/core";
import { fetchVerifiedEvents, submitUserReport } from "@atlas/supabase-client";
import { MapService } from "./map/map-service";
import { InterestsService } from "./services/interests";
import { closeEventSheet, openEventSheet, shareEvent } from "./ui/event-sheet";
import { renderShell } from "./ui/shell";
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
  lat: number;
  lng: number;
}

export class AtlasApp {
  private allEvents: AtlasEvent[] = [];
  private currentRange: DateRangeKey = DEFAULT_DATE_RANGE;
  private locationRequestRunning = false;
  private initialMapFitDone = false;
  private readonly interests = new InterestsService();
  private mapService!: MapService;

  start(): void {
    const root = document.getElementById("app");
    if (!root) throw new Error("Elemento #app non trovato");
    root.innerHTML = renderShell();

    this.mapService = new MapService(
      (lat: number, lng: number) => this.setDraftPosition(lat, lng),
      (event: AtlasEvent) => this.handleOpenEvent(event),
    );

    this.bindEvents();
    this.renderPrograms();
    void this.loadEvents();
    this.restoreTopbar();
  }

  private handleOpenEvent(event: AtlasEvent): void {
    openEventSheet(
      event,
      (e: AtlasEvent) => {
        this.interests.save(e);
        this.renderPrograms();
      },
      shareEvent,
      showToast,
    );
  }

  private bindEvents(): void {
    document.getElementById("whenButton")?.addEventListener("click", () => {
      this.closeDockFlyouts();
      document.getElementById("filterPanel")?.classList.toggle("open");
      document.getElementById("programsPanel")?.classList.remove("open");
    });

    document.getElementById("programsButton")?.addEventListener("click", () => {
      this.closeDockFlyouts();
      this.renderPrograms();
      document.getElementById("programsPanel")?.classList.toggle("open");
      document.getElementById("filterPanel")?.classList.remove("open");
    });

    document.getElementById("dockNearBtn")?.addEventListener("click", () => {
      this.toggleDockFlyout("near");
    });
    document.getElementById("dockInsertBtn")?.addEventListener("click", () => {
      this.toggleDockFlyout("insert");
    });
    document.getElementById("closeNearFlyout")?.addEventListener("click", () => {
      this.closeDockFlyouts();
    });
    document.getElementById("closeInsertFlyout")?.addEventListener("click", () => {
      this.closeDockFlyouts();
    });

    document.querySelectorAll(".filter-option").forEach((button) => {
      button.addEventListener("click", () => {
        this.currentRange = (button as HTMLButtonElement).dataset.range as DateRangeKey;
        document.querySelectorAll(".filter-option").forEach((b) => b.classList.remove("active"));
        button.classList.add("active");
        this.updateWhenButtonLabel();
        this.renderMapEvents();
        document.getElementById("filterPanel")?.classList.remove("open");
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

    document.getElementById("openSearchMobile")?.addEventListener("click", () => {
      this.openMobileSheet("near");
    });

    document.getElementById("openInsertMobile")?.addEventListener("click", () => {
      this.openMobileSheet("insert");
    });

    document.getElementById("closeSheet")?.addEventListener("click", () => {
      document.getElementById("mobileSheet")?.classList.remove("open");
    });

    document.getElementById("stableEventOverlay")?.addEventListener("click", closeEventSheet);
    document.getElementById("nearMeButtonDock")?.addEventListener("click", () => this.goNearMe());
    document.getElementById("nearMeButtonMobile")?.addEventListener("click", () => this.goNearMe());

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
        applyMapUiScale();
        this.renderMapEvents();
      }, 150);
    });
  }

  private async loadEvents(): Promise<void> {
    try {
      this.allEvents = await fetchVerifiedEvents();
      this.renderMapEvents();
    } catch (error) {
      console.error(error);
      showToast("Impossibile caricare gli eventi.");
    }
  }

  private getVisibleEvents(): AtlasEvent[] {
    return this.allEvents.filter((event) => isEventVisibleInRange(event, this.currentRange));
  }

  private renderMapEvents(): void {
    const deepLink = new URLSearchParams(window.location.search).get("event");
    const visible = this.getVisibleEvents();
    const pinCount = this.mapService.renderEvents(visible, deepLink);
    const withCoords = visible.filter(hasValidEventCoords).length;
    this.updateMapEventCount(pinCount, visible.length, withCoords, this.allEvents.length);

    if (!deepLink && !this.initialMapFitDone && visible.length > 0) {
      const coords = buildMapMarkerPlacements(visible).map(
        (p) => [p.lat, p.lng] as [number, number],
      );
      this.mapService.fitToCoordinates(coords);
      this.initialMapFitDone = true;
    }
  }

  private updateMapEventCount(
    pins: number,
    inRange: number,
    withCoords: number,
    loaded: number,
  ): void {
    const el = document.getElementById("mapEventCount");
    if (!el) return;
    const skipped = inRange - withCoords;
    el.textContent = `📍 ${pins} pin · ${inRange} nel periodo · ${loaded} caricati · v${ATLAS_VERSION}${skipped > 0 ? ` · ${skipped} senza coordinate` : ""}`;
  }

  private toggleDockFlyout(which: "near" | "insert"): void {
    const near = document.getElementById("dockNearFlyout");
    const insert = document.getElementById("dockInsertFlyout");
    const nearBtn = document.getElementById("dockNearBtn");
    const insertBtn = document.getElementById("dockInsertBtn");
    document.getElementById("filterPanel")?.classList.remove("open");
    document.getElementById("programsPanel")?.classList.remove("open");

    const nearOpen = which === "near" && !near?.classList.contains("open");
    const insertOpen = which === "insert" && !insert?.classList.contains("open");

    near?.classList.toggle("open", nearOpen);
    insert?.classList.toggle("open", insertOpen);
    near?.setAttribute("aria-hidden", nearOpen ? "false" : "true");
    insert?.setAttribute("aria-hidden", insertOpen ? "false" : "true");
    nearBtn?.classList.toggle("active", nearOpen);
    insertBtn?.classList.toggle("active", insertOpen);
  }

  private closeDockFlyouts(): void {
    ["dockNearFlyout", "dockInsertFlyout"].forEach((id) => {
      const el = document.getElementById(id);
      el?.classList.remove("open");
      el?.setAttribute("aria-hidden", "true");
    });
    document.getElementById("dockNearBtn")?.classList.remove("active");
    document.getElementById("dockInsertBtn")?.classList.remove("active");
  }

  private openMobileSheet(which: "near" | "insert"): void {
    const sheet = document.getElementById("mobileSheet");
    const nearPanel = document.getElementById("mobileNearPanel");
    const insertPanel = document.getElementById("mobileInsertPanel");
    sheet?.classList.add("open");
    nearPanel?.classList.toggle("hidden", which !== "near");
    insertPanel?.classList.toggle("hidden", which !== "insert");
  }

  private updateWhenButtonLabel(): void {
    const button = document.getElementById("whenButton");
    if (button) {
      button.textContent = `🗓 Cerca entro: ${DATE_RANGE_LABELS[this.currentRange] ?? "15 giorni"}`;
    }
  }

  private setDraftPosition(lat: number, lng: number): void {
    ["lat", "latMobile"].forEach((id) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) el.value = lat.toFixed(6);
    });
    ["lng", "lngMobile"].forEach((id) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) el.value = lng.toFixed(6);
    });
    this.mapService.setDraftPosition(lat, lng);
    setStatus("Posizione selezionata.", "success");
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
      lat: Number((document.getElementById(`lat${suffix}`) as HTMLInputElement).value),
      lng: Number((document.getElementById(`lng${suffix}`) as HTMLInputElement).value),
    };
  }

  private clearForm(source: "desktop" | "mobile"): void {
    const suffix = source === "mobile" ? "Mobile" : "";
    ["title", "start_date", "end_date", "venue", "event_url", "image_url", "description", "contact", "lat", "lng"].forEach((id) => {
      const el = document.getElementById(`${id}${suffix}`) as HTMLInputElement | HTMLTextAreaElement | null;
      if (el) el.value = "";
    });
  }

  private async addEvent(source: "desktop" | "mobile"): Promise<void> {
    const button = document.getElementById(source === "mobile" ? "saveButtonMobile" : "saveButton") as HTMLButtonElement;
    const form = this.syncFormValues(source);

    if (!form.title || !form.startDate || !form.contact || !Number.isFinite(form.lat) || !Number.isFinite(form.lng)) {
      setStatus("Inserisci titolo, data di inizio, contatto e posizione sulla mappa.", "error");
      return;
    }

    if (form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
      setStatus("La data di fine non può essere precedente alla data di inizio.", "error");
      return;
    }

    const candidate = {
      title: form.title,
      start_date: new Date(form.startDate).toISOString(),
      venue: form.venue,
      lat: form.lat,
      lng: form.lng,
    };

    const duplicate = this.allEvents.find((event) => eventsLookSimilar(candidate, event));
    if (duplicate) {
      setStatus("Questo evento risulta già presente su Atlas.", "error");
      this.mapService.fitToCoordinates([[duplicate.lat, duplicate.lng]]);
      setTimeout(() => this.handleOpenEvent(duplicate), 300);
      return;
    }

    const payload: EventSubmissionInput = {
      title: form.title,
      category: form.category,
      start_date: new Date(form.startDate).toISOString(),
      end_date: form.endDate ? new Date(form.endDate).toISOString() : null,
      venue: form.venue || null,
      event_url: form.eventUrl || null,
      image_url: form.imageUrl || null,
      description: form.description || null,
      lat: form.lat,
      lng: form.lng,
      contact: form.contact,
      contact_type: detectContactType(form.contact),
      territory_id: "IT-VT",
    };

    button.disabled = true;
    button.textContent = "Invio in corso...";
    setStatus("");

    try {
      const referenceCode = generateSubmissionReference();
      const opsWhatsApp = import.meta.env.VITE_ATLAS_OPS_WHATSAPP?.replace(/\D/g, "") ?? "";

      await submitUserReport({ ...payload, reference_code: referenceCode });

      setStatus("Segnalazione inviata: verrà pubblicata se non già presente tra le fonti.", "success");

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

    const activeEvents = this.getVisibleEvents();
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
      button.textContent = interests.length ? `🔖 Eventi salvati (${interests.length})` : "🔖 Eventi salvati";
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
          <span>${formatDate(item.start_date)}</span>
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

  private setLocationButtonsBusy(isBusy: boolean): void {
    const label = isBusy ? "📍 Cerco vicino a te..." : "📍 Cerca vicino a me";
    ["nearMeButtonDock", "nearMeButtonMobile"].forEach((id) => {
      const button = document.getElementById(id) as HTMLButtonElement | null;
      if (!button) return;
      button.disabled = isBusy;
      button.textContent = label;
    });
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

        document.getElementById("mobileSheet")?.classList.remove("open");
        this.mapService.flyToUser(lat, lng);
        showToast("Mappa centrata sulla tua posizione.");
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
    const topbar = document.querySelector(".topbar") as HTMLElement | null;
    if (!topbar) return;
    topbar.style.display = "flex";
    topbar.style.visibility = "visible";
    topbar.style.opacity = "1";
  }
}
