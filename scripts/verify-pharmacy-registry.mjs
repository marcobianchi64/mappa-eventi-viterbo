#!/usr/bin/env node
import {
  ATLAS_PHARMACY_PLACES_VT,
  attachPharmacyPlaceIds,
  findUnmatchedDutyPharmacies,
} from "@atlas/core";

if (ATLAS_PHARMACY_PLACES_VT.length < 100) {
  throw new Error(`Registro farmacie VT incompleto: attese almeno 100, trovate ${ATLAS_PHARMACY_PLACES_VT.length}`);
}

const [matched] = attachPharmacyPlaceIds([
  {
    name: "ANTICA FARMACIA SACCARELLI SAS DEL DOTT. F. CATOCCI E C.",
    municipality: "Acquapendente",
    address: "Piazza Girolamo Fabrizio, 15 - 01021 Acquapendente (VT)",
  },
]);
if (matched?.placeId !== "place-pharmacy-ministero-10101") {
  throw new Error("La farmacia di turno deve essere collegata al record Ministero");
}

if (findUnmatchedDutyPharmacies([matched]).length !== 0) {
  throw new Error("Una farmacia riconciliata non deve restare tra le osservazioni senza registro");
}

console.log("✓ verify-pharmacy-registry OK", {
  pharmacies: ATLAS_PHARMACY_PLACES_VT.length,
  matchedPlaceId: matched.placeId,
});
