import L from "leaflet";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAP_TILE_ATTRIBUTION,
  MAP_TILE_SUBDOMAINS,
  MAP_TILE_URL,
  buildMapMarkerPlacements,
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
    L.tileLayer(MAP_TILE_URL, {
      attribution: MAP_TILE_ATTRIBUTION,
      subdomains: [...MAP_TILE_SUBDOMAINS],
    }).addTo(this.map);
    this.layer.addTo(this.map);
  }

  render(events: AtlasEvent[]): number {
    this.lastEvents = events;
    this.layer.clearLayers();
    this.markers.clear();

    const placements = buildMapMarkerPlacements(events);

    for (const { event, lat, lng } of placements) {
      const marker = L.marker([lat, lng], {
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

    return placements.length;
  }

  refreshScale(): void {
    if (this.lastEvents.length > 0) this.render(this.lastEvents);
  }

  focus(event: AtlasEvent): void {
    if (!Number.isFinite(event.lat) || !Number.isFinite(event.lng)) return;
    const marker = event.date_event ? this.markers.get(event.date_event) : undefined;
    if (marker) {
      const latLng = marker.getLatLng();
      this.map.setView(latLng, 14);
      marker.openTooltip();
      return;
    }
    this.map.setView([event.lat, event.lng], 14);
  }

  invalidateSize(): void {
    this.map.invalidateSize();
  }
}
