import {
  formatComuneLabel,
  inferComuneFromText,
  listViterboComuni,
  normalizeComuneName,
} from "../viterbo-geocode.js";
import type { TerritoryResolver } from "./resolver.js";

export const viterboTerritoryResolver: TerritoryResolver = {
  territoryRootId: "IT-VT",
  countryCode: "IT",
  listMunicipalityKeys() {
    return listViterboComuni();
  },
  formatMunicipalityLabel(key: string) {
    return formatComuneLabel(normalizeComuneName(key) ?? key);
  },
  inferMunicipalityFromText(text: string) {
    const key = inferComuneFromText(text);
    return key ? normalizeComuneName(key) : null;
  },
};
