import type { UtilitySyncSnapshot } from "./atlas-utility-sync.js";

export function utilityTodayRome(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
}

/** Unisce snapshot statico (GitHub Pages) e remoto (Supabase), preferendo turni farmacia di oggi. */
export function mergeUtilitySnapshots(
  staticSnap: UtilitySyncSnapshot | null,
  remoteSnap: UtilitySyncSnapshot | null,
): UtilitySyncSnapshot | null {
  if (!staticSnap && !remoteSnap) return null;
  if (!staticSnap) return remoteSnap;
  if (!remoteSnap) return staticSnap;

  const today = utilityTodayRome();
  const pharmacies = pickPharmacySection(staticSnap, remoteSnap, today);
  const cinema = pickCinemaSection(staticSnap, remoteSnap);
  const syncedAt =
    new Date(remoteSnap.syncedAt).getTime() >= new Date(staticSnap.syncedAt).getTime()
      ? remoteSnap.syncedAt
      : staticSnap.syncedAt;

  return {
    editionId: remoteSnap.editionId || staticSnap.editionId,
    territoryId: remoteSnap.territoryId || staticSnap.territoryId,
    syncedAt,
    pharmacies,
    cinema,
    coverage: remoteSnap.coverage ?? staticSnap.coverage,
    operationalAlerts: remoteSnap.operationalAlerts ?? staticSnap.operationalAlerts,
  };
}

function pickPharmacySection(
  a: UtilitySyncSnapshot,
  b: UtilitySyncSnapshot,
  today: string,
): UtilitySyncSnapshot["pharmacies"] {
  const da = a.pharmacies.dutyDate ?? "";
  const db = b.pharmacies.dutyDate ?? "";
  if (db === today) return b.pharmacies;
  if (da === today) return a.pharmacies;
  if (db > da) return b.pharmacies;
  if (da > db) return a.pharmacies;
  return b.pharmacies.items.length >= a.pharmacies.items.length ? b.pharmacies : a.pharmacies;
}

function pickCinemaSection(
  a: UtilitySyncSnapshot,
  b: UtilitySyncSnapshot,
): UtilitySyncSnapshot["cinema"] {
  const ta = Date.parse(a.syncedAt);
  const tb = Date.parse(b.syncedAt);
  const newer = tb >= ta ? b : a;
  const older = tb >= ta ? a : b;
  const newerFilms = newer.cinema.items.length;
  if (newerFilms > 0) return newer.cinema;
  return older.cinema.items.length > 0 ? older.cinema : newer.cinema;
}