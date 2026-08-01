export type TerritoryLevel = "country" | "region" | "province" | "municipality" | "locality";

export interface Territory {
  id: string;
  name: string;
  level: TerritoryLevel;
  parent_id?: string | null;
  country_code: string;
  timezone?: string;
  created_at?: string;
}
