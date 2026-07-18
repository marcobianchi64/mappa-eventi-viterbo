import L from "leaflet";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  formatDisplayTitle,
  getCategoryMeta,
  type AtlasEvent,
} from "@atlas/core";

export class AdminMapService {
  private map: L.Map;
  private layer = L.layerGroup();
  private markers = new Map<string, L.Marker>();

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
    this.layer.clearLayers();
    this.markers.clear();

    for (const event of events) {
      if (!Number.isFinite(event.lat) || !Number.isFinite(event.lng)) continue;
      const meta = getCategoryMeta(event.category);
      const marker = L.marker([event.lat, event.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="background:${meta.color};color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)">${meta.icon}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      });
      marker.bindTooltip(
        `<strong>${formatDisplayTitle(event.title)}</strong><br>${event.venue ?? ""}`,
        { direction: "top" },
      );
      marker.on("click", () => this.onSelect(event));
      marker.addTo(this.layer);
      if (event.date_event) this.markers.set(event.date_event, marker);
    }
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
