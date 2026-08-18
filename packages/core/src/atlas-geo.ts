/** Contesto geografico per URL e servizi esterni (scalabile Italia → regione → provincia → comune). */
export interface AtlasGeoContext {
  countryCode: string;
  regionSlug?: string;
  provinceSlug?: string;
  provinceCode?: string;
  municipalitySlug?: string;
  municipalityName?: string;
}

export function slugifyTerritoryName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
