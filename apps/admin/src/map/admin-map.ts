import L from "leaflet";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  dedupeEventsForMap,
  escapeHtml,
  formatDisplayTitle,
  getDisplayCategory,
  ATLAS_MAP_TOOLTIP_CLASS,
  createAtlasMapMarkerIcon,
  type AtlasEvent,
} from "@atlas/core";

export class AdminMapService {
  private map: L.Map;
  private layer = L.layerGroup();
  private markers = new Map<string, L.Marker>();
  private lastEvents: AtlasEvent[] = [];

  constructor(
    containerId: string,
    private onSelect: (event: AtlasEvent) => void,
  ) {
    this.map = L.map(containerId).setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(this.map);
    this.layer.addTo(this.map);
  }

  render(events: AtlasEvent[]): void {
    this.lastEvents = events;
    this.layer.clearLayers();
    this.markers.clear();

    for (const event of dedupeEventsForMap(events)) {
      if (!Number.isFinite(event.lat) || !Number.isFinite(event.lng)) continue;
      const marker = L.marker([event.lat, event.lng], {
        icon: L.divIcon({
          className: "",
          ...createAtlasMapMarkerIcon(getDisplayCategory(event)),
        }),
      });
      const title = escapeHtml(formatDisplayTitle(event.title));
      const venue = event.venue ? escapeHtml(event.venue) : "";
      marker.bindTooltip(`<strong>${title}</strong>${venue ? `<br><span>${venue}</span>` : ""}`, {
        className: ATLAS_MAP_TOOLTIP_CLASS,
        direction: "top",
      });
      marker.on("click", () => this.onSelect(event));
      marker.addTo(this.layer);
      if (event.date_event) this.markers.set(event.date_event, marker);
    }
  }

  refreshScale(): void {
    if (this.lastEvents.length > 0) this.render(this.lastEvents);
  }

  focus(event: AtlasEvent): void {
    if (!Number.isFinite(event.lat) || !Number.isFinite(event.lng)) return;
    this.map.setView([event.lat, event.lng], 14);
    const marker = event.date_event ? this.markers.get(event.date_event) : undefined;
    marker?.openTooltip();
  }

  invalidateSize(): void {
    this.map.invalidateSize();
  }
}
