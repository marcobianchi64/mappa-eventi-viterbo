import L from "leaflet";
import "leaflet.markercluster";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAP_TILE_ATTRIBUTION,
  MAP_TILE_SUBDOMAINS,
  MAP_TILE_URL,
  buildMapMarkerPlacements,
  assessEventLocation,
  escapeHtml,
  formatEventSchedule,
  formatFestivalListDate,
  getDisplayCategory,
  getEventDisplayTitle,
  getFestivalPinTitle,
  isHttpUrl,
  ATLAS_MAP_TOOLTIP_CLASS,
  createAtlasDraftMarkerIcon,
  createAtlasMapMarkerIcon,
  getMapUiScale,
  type AtlasEvent,
  type FestivalMapGroup,
} from "@atlas/core";

function createAtlasMarkerClusterGroup(): L.MarkerClusterGroup {
  return L.markerClusterGroup({
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    disableClusteringAtZoom: 17,
    maxClusterRadius: (zoom: number): number => {
      if (zoom <= 9) return 90;
      if (zoom <= 12) return 65;
      if (zoom <= 14) return 48;
      return 36;
    },
    iconCreateFunction: (cluster: L.MarkerCluster): L.DivIcon => {
      const count = cluster.getChildCount();
      const sizeClass =
        count < 10 ? "atlas-cluster-sm" : count < 100 ? "atlas-cluster-md" : "atlas-cluster-lg";
      return L.divIcon({
        html: `<div class="atlas-cluster ${sizeClass}"><span>${count}</span></div>`,
        className: "",
        iconSize: L.point(44, 44),
      });
    },
  });
}

export class MapService {
  private map: L.Map;
  private eventLayer = createAtlasMarkerClusterGroup();
  private draftMarker: L.Marker | null = null;
  private userMarker: L.CircleMarker | null = null;

  constructor(
    private onDraftPosition: (lat: number, lng: number) => void,
    private onOpenEvent: (event: AtlasEvent, festivalGroup?: FestivalMapGroup) => void,
  ) {
    this.map = L.map("map").setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
    L.tileLayer(MAP_TILE_URL, {
      attribution: MAP_TILE_ATTRIBUTION,
      subdomains: [...MAP_TILE_SUBDOMAINS],
    }).addTo(this.map);
    this.eventLayer.addTo(this.map);

    this.map.on("click", (e) => this.onDraftPosition(e.latlng.lat, e.latlng.lng));
  }

  private createMarkerIcon(category: string): L.DivIcon {
    return L.divIcon({
      className: "",
      ...createAtlasMapMarkerIcon(category),
    });
  }

  private createDraftIcon(): L.DivIcon {
    return L.divIcon({
      className: "",
      ...createAtlasDraftMarkerIcon(),
    });
  }

  private createTooltip(event: AtlasEvent, festivalGroup?: FestivalMapGroup): string {
    const location = assessEventLocation(event);

    if (festivalGroup && festivalGroup.events.length > 1) {
      const title = escapeHtml(festivalGroup.label);
      const rows = festivalGroup.events
        .map((item) => {
          const date = escapeHtml(formatFestivalListDate(item.start_date));
          const pinTitle = escapeHtml(getFestivalPinTitle(item));
          return `<li class="event-preview-compact-row">
            <span class="event-preview-compact-date">${date}</span>
            <span class="event-preview-compact-title">${pinTitle}</span>
          </li>`;
        })
        .join("");

      return `
        <div class="event-preview event-preview-festival-compact">
          <strong>${title}</strong>
          <span class="event-preview-compact-hint">${festivalGroup.events.length} appuntamenti · clicca per dettagli</span>
          <ul class="event-preview-compact-list">${rows}</ul>
        </div>
      `;
    }

    const title = escapeHtml(getEventDisplayTitle(event));
    const venue = escapeHtml(location.placeLabel);
    const image =
      isHttpUrl(event.image_url)
        ? `<img src="${escapeHtml(event.image_url)}" alt="${title}" onerror="this.remove()">`
        : "";

    return `
      <div class="event-preview">
        ${image}
        <strong>${title}</strong>
        <span class="event-preview-date">${escapeHtml(formatEventSchedule(event))}</span>
        ${venue ? `<span class="event-preview-venue">${venue}</span>` : ""}
        ${
          !location.allowDirections
            ? `<span class="event-preview-location-hint">Posizione da confermare — navigatore non disponibile</span>`
            : ""
        }
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
      const { event, lat, lng, festivalGroup } = placement;
      const marker = L.marker([lat, lng], {
        icon: this.createMarkerIcon(getDisplayCategory(event)),
      });
      marker.bindTooltip(this.createTooltip(event, festivalGroup), {
        className: ATLAS_MAP_TOOLTIP_CLASS,
        direction: "top",
        offset: [0, -8],
        opacity: 0.98,
        sticky: true,
        interactive: false,
      });
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        this.onOpenEvent(event, festivalGroup);
      });
      this.eventLayer.addLayer(marker);

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

  flyToUser(lat: number, lng: number, radiusKm?: number): void {
    if (this.userMarker) this.map.removeLayer(this.userMarker);
    const pinRadius = Math.round(getMapUiScale().markerSizePx * 0.18);
    this.userMarker = L.circleMarker([lat, lng], {
      radius: pinRadius,
      color: "#ffffff",
      weight: 3,
      fillColor: "#2563eb",
      fillOpacity: 1,
    }).addTo(this.map);
    this.userMarker.bindPopup("Sei qui").openPopup();

    if (radiusKm && radiusKm > 0) {
      this.setNearRadiusCircle(lat, lng, radiusKm);
      const circle = L.circle([lat, lng], { radius: radiusKm * 1000 });
      this.map.fitBounds(circle.getBounds(), { padding: [48, 48], maxZoom: 12 });
    } else {
      this.map.invalidateSize(true);
      this.map.flyTo([lat, lng], 14, { animate: true, duration: 0.8 });
    }
  }

  private nearCircle: L.Circle | null = null;

  setNearRadiusCircle(lat: number, lng: number, radiusKm: number): void {
    if (this.nearCircle) this.map.removeLayer(this.nearCircle);
    this.nearCircle = L.circle([lat, lng], {
      radius: radiusKm * 1000,
      color: "#2563eb",
      weight: 2,
      dashArray: "6 4",
      fillColor: "#2563eb",
      fillOpacity: 0.1,
    }).addTo(this.map);
  }

  clearNearRadiusCircle(): void {
    if (this.nearCircle) {
      this.map.removeLayer(this.nearCircle);
      this.nearCircle = null;
    }
  }

  fitBoundsWithUserAndEvents(
    userLat: number,
    userLng: number,
    coordinates: [number, number][],
    radiusKm: number,
  ): void {
    const bounds = L.latLngBounds([[userLat, userLng]]);
    for (const [lat, lng] of coordinates) bounds.extend([lat, lng]);
    const circle = L.circle([userLat, userLng], { radius: radiusKm * 1000 });
    const circleBounds = circle.getBounds();
    bounds.extend(circleBounds.getSouthWest());
    bounds.extend(circleBounds.getNorthEast());
    this.map.fitBounds(bounds, { padding: [52, 52], maxZoom: 13 });
  }

  invalidateSize(): void {
    this.map.invalidateSize();
  }
}
