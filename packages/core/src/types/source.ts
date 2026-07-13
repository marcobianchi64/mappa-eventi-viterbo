export type SourceType =
  | "institutional"
  | "aggregator"
  | "editorial"
  | "cultural"
  | "association"
  | "commercial"
  | "social"
  | "user_report"
  | "other";

export type AcquisitionMode = "manual" | "assisted" | "automatic" | "api";
export type SourceReliability = "A" | "B" | "C";
export type SourceStatus = "active" | "inactive" | "error";

export interface AtlasSource {
  id: string;
  name: string;
  source_type: SourceType;
  territory_id?: string | null;
  url?: string | null;
  acquisition_mode: AcquisitionMode;
  reliability: SourceReliability;
  update_frequency: string;
  status: SourceStatus;
  last_sync_at?: string | null;
  last_sync_status?: string | null;
  events_produced?: number;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SourceInput {
  name: string;
  source_type: SourceType;
  territory_id?: string | null;
  url?: string | null;
  acquisition_mode: AcquisitionMode;
  reliability: SourceReliability;
  update_frequency?: string;
  status?: SourceStatus;
  notes?: string | null;
}
