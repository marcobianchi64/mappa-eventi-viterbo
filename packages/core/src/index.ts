export type {
  AtlasEvent,
  EventCategory,
  EventSubmission,
  ReviewStatus,
  DateRangeKey,
  SavedInterest,
  DateRangeWindow,
  CategoryMeta,
} from "./types/event.js";

export type { Territory, TerritoryLevel } from "./types/territory.js";
export type {
  AtlasSource,
  SourceType,
  AcquisitionMode,
  SourceReliability,
  SourceStatus,
  SourceInput,
} from "./types/source.js";
export type {
  EventSubmissionInput,
  EventSubmissionRecord,
  SubmissionStatus,
  ContactType,
} from "./types/submission.js";

export {
  ATLAS_VERSION,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAP_TILE_URL,
  MAP_TILE_ATTRIBUTION,
  MAP_TILE_SUBDOMAINS,
  CATEGORY_META,
  DATE_RANGE_LABELS,
  DEFAULT_DATE_RANGE,
  INTERESTS_STORAGE_KEY,
  MANUAL_DISCOVERY_SOURCE_ID,
  DEFAULT_OPS_WHATSAPP,
} from "./constants.js";

export {
  MAP_UI_SCALE,
  MAP_UI_SCALE_DESKTOP,
  MAP_UI_SCALE_MOBILE,
  MAP_UI_BREAKPOINT_PX,
  ATLAS_UI_SCALE_CONTRACT_VERSION,
  ATLAS_UI_MIN_TOUCH_PX,
  ATLAS_UI_MIN_BODY_FONT_PX,
  applyMapUiScale,
  getMapMarkerIconLayout,
  getMapUiScale,
  isMobileMapViewport,
  type MapMarkerIconLayout,
  type MapUiScaleTokens,
} from "./map-ui-scale.js";

export {
  buildAtlasTypographyLockCss,
  injectAtlasTypography,
} from "./atlas-typography-lock.js";

export type { DiscoveryRow, DiscoverySessionMeta } from "./discovery-parse.js";
export {
  countDiscoveryDataRowsInPaste,
  mergeBrokenMarkdownTableLines,
  prepareDiscoveryPasteText,
  stripDiscoveryFootnotes,
  parseMarkdownTables,
  parseDiscoveryText,
  loadDiscoverySession,
  registerDiscoveryBlock,
} from "./discovery-parse.js";

export { discoveryEventExternalId } from "./discovery-external-id.js";

export {
  normalizeDiscoveryDateString,
  parseDiscoveryDateTime,
  sanitizeDiscoveryCell,
} from "./discovery-normalize.js";

export {
  VITERBO_PROVINCE_CENTER,
  geocodeComuneViterbo,
  normalizeComuneName,
  inferComuneFromText,
  inferComuneForEvent,
  formatComuneLabel,
  distanceKm,
  isPinFarFromComune,
  listViterboComuni,
  isLegacyViterboCenter,
  resolveEventCoordinates,
} from "./viterbo-geocode.js";

export {
  inferEventCategory,
  inferCategoryFromTitle,
  resolveEventCategory,
  getDisplayCategory,
  FOOD_TITLE_KEYWORDS,
  type CategoryInferInput,
} from "./category-infer.js";

export {
  cleanPublishedTitle,
  getEventDisplayTitle,
  refineEventTitle,
  splitGluedWords,
} from "./title-format.js";

export type { DuplicateComparableEvent } from "./event-duplicate.js";
export {
  dedupeEventsForMap,
  eventDatesOverlap,
  eventsAreDiscoveryDuplicates,
  eventsAreLikelyDuplicates,
  eventsAreMapDuplicates,
  eventsAreSameCalendarEvent,
  eventsSuppressedByMapDedupe,
  findAllDuplicateClusters,
  findCoordTitleClusters,
  findDuplicateClusters,
  findMapPinClusters,
  mergeEventClusters,
  titleFingerprint,
  titlesLookSimilar,
} from "./event-duplicate.js";

export {
  getCategoryMeta,
  escapeHtml,
  formatDate,
  getRangeWindow,
  isEventVisibleInRange,
  getEventLifecycle,
  isRegistryInPubblicazione,
  hasValidEventCoords,
  buildMapMarkerPlacements,
  type MapMarkerPlacement,
  normalizeSearchText,
  searchableEventText,
  directionsUrl,
  createEventShareUrl,
  reminderText,
  eventsLookSimilar,
  detectContactType,
  formatDisplayTitle,
  generateSubmissionReference,
  buildSubmissionWhatsAppUrl,
} from "./utils.js";

export {
  createAtlasDraftMarkerIcon,
  createAtlasMapMarkerIcon,
  ATLAS_MAP_TOOLTIP_CLASS,
  type AtlasMapMarkerIconSpec,
} from "./map-marker.js";

export type { CompareEventRow, CompareMapRegistryReport } from "./compare-map-registry.js";
export {
  compareMapRegistryFromEvents,
  formatCompareReport,
  renderCompareSummaryHtml,
} from "./compare-map-registry.js";
