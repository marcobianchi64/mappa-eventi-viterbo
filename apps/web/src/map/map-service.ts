import L from "leaflet";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  buildMapMarkerPlacements,
  escapeHtml,
  formatDisplayTitle,
  getCategoryMeta,
  type AtlasEvent,
} from "@atlas/core";

export class MapService {
  private map: L.Map;
  private eventLayer = L.layerGroup();
  private draftMarker: L.Marker | null = null;
  private userMarker: L.CircleMarker | null = null;

  constructor(
    private onDraftPosition: (lat: number, lng: number) => void,
    private onOpenEvent: (event: AtlasEvent) => void,
  ) {
    this.map = L.map("map").setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(this.map);
    this.eventLayer.addTo(this.map);

    this.map.on("click", (e) => this.onDraftPosition(e.latlng.lat, e.latlng.lng));
  }

  private createMarkerIcon(category: string): L.DivIcon {
    const meta = getCategoryMeta(category);
    return L.divIcon({
      className: "",
      html: `<div class="atlas-marker" style="background:${meta.color}"><span>${meta.icon}</span></div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -30],
      tooltipAnchor: [0, -30],
    });
  }

  private createDraftIcon(): L.DivIcon {
    return L.divIcon({
      className: "",
      html: `<div class="draft-marker"></div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -30],
    });
  }

  private createTooltip(event: AtlasEvent): string {
    const title = escapeHtml(formatDisplayTitle(event.title));
    const venue = event.venue ?? "";
    const image = event.image_url
      ? `<img src="${event.image_url}" alt="${title}" onerror="this.remove()">`
      : "";

    return `
      <div class="event-preview">
        ${image}
        <strong>${title}</strong>
        <span>${new Date(event.start_date).toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short" })}</span>
        ${venue ? `<span>${venue}</span>` : ""}
      </div>
    `;
  }

  setDraftPosition(lat: number, lng: number): void {
    if (this.draftMarker) this.map.removeLayer(this.draftMarker);
    this.draftMarker = L.marker([lat, lng], { icon: this.createDraftIcon() })
      .addTo(this.map)
      .bindPopup("Posizione selezionata per il nuovo evento")
      .openPopup();
  }

  clearDraftMarker(): void {
    if (this.draftMarker) {
      this.map.removeLayer(this.draftMarker);
      this.draftMarker = null;
    }
  }

  renderEvents(events: AtlasEvent[], deepLinkEventId: string | null): number {
    this.eventLayer.clearLayers();
    const placements = buildMapMarkerPlacements(events);

    for (const placement of placements) {
      const { event, lat, lng } = placement;
      const marker = L.marker([lat, lng], {
        icon: this.createMarkerIcon(event.category),
      });
      marker.bindTooltip(this.createTooltip(event), {
        direction: "top",
        offset: [0, -8],
        opacity: 0.98,
        sticky: true,
      });
      marker.on("click", () => this.onOpenEvent(event));
      marker.addTo(this.eventLayer);

      if (deepLinkEventId && event.date_event && deepLinkEventId === String(event.date_event)) {
        this.map.setView([lat, lng], 14);
        setTimeout(() => this.onOpenEvent(event), 500);
      }
    }

    return placements.length;
  }

  fitToCoordinates(coordinates: [number, number][]): void {
    if (coordinates.length === 1) {
      this.map.setView(coordinates[0], 14);
    } else if (coordinates.length > 1) {
      this.map.fitBounds(coordinates, { padding: [45, 45], maxZoom: 14 });
    }
  }

  flyToUser(lat: number, lng: number): void {
    if (this.userMarker) this.map.removeLayer(this.userMarker);
    this.userMarker = L.circleMarker([lat, lng], {
      radius: 9,
      color: "#ffffff",
      weight: 3,
      fillColor: "#2563eb",
      fillOpacity: 1,
    }).addTo(this.map);
    this.userMarker.bindPopup("Sei qui").openPopup();
    this.map.invalidateSize(true);
    this.map.flyTo([lat, lng], 14, { animate: true, duration: 0.8 });
  }

  invalidateSize(): void {
    this.map.invalidateSize();
  }
}
