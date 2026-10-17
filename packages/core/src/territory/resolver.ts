/** Astrazione territorio: implementazioni per pilota (VT) e futuri paesi/regioni. */
export interface TerritoryResolver {
  readonly territoryRootId: string;
  readonly countryCode: string;
  listMunicipalityKeys(): string[];
  formatMunicipalityLabel(key: string): string;
  inferMunicipalityFromText(text: string): string | null;
}
