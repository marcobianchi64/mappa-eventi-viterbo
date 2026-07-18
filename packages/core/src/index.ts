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
  CATEGORY_META,
  DATE_RANGE_LABELS,
  DEFAULT_DATE_RANGE,
  INTERESTS_STORAGE_KEY,
  MANUAL_DISCOVERY_SOURCE_ID,
  DEFAULT_OPS_WHATSAPP,
} from "./constants.js";

export type { DiscoveryRow, DiscoverySessionMeta } from "./discovery-parse.js";
export {
  parseMarkdownTables,
  parseDiscoveryText,
  loadDiscoverySession,
  registerDiscoveryBlock,
} from "./discovery-parse.js";

export {
  getCategoryMeta,
  escapeHtml,
  formatDate,
  getRangeWindow,
  isEventVisibleInRange,
  getEventLifecycle,
  isRegistryInPubblicazione,
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
