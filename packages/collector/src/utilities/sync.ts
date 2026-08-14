import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ATLAS_EDITION, type UtilitySyncSnapshot } from "@atlas/core";
import { fetchHtml } from "../connectors/fetch-html.js";
import { parseCinemaFromMyMovies, parsePharmaciesFromPagineGialle } from "./parse.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUTPUT = resolve(__dirname, "../../../../apps/web/public/data/utilities/viterbo.json");

export interface SyncUtilitiesOptions {
  editionId?: string;
  outputPath?: string;
}

export async function syncUtilities(options: SyncUtilitiesOptions = {}): Promise<UtilitySyncSnapshot> {
  const edition = ATLAS_EDITION;
  const editionId = options.editionId ?? edition.id;
  const pharmacyUrl = "https://www.paginegialle.it/farmacie-turno/viterbo";
  const cinemaUrl = "https://www.mymovies.it/cinema/viterbo/provincia/";

  console.log(`→ Farmacie: ${pharmacyUrl}`);
  const pharmacyHtml = await fetchHtml(pharmacyUrl);
  const pharmacies = parsePharmaciesFromPagineGialle(pharmacyHtml);
  console.log(`  ${pharmacies.length} farmacie trovate`);

  console.log(`→ Cinema: ${cinemaUrl}`);
  const cinemaHtml = await fetchHtml(cinemaUrl);
  const cinema = parseCinemaFromMyMovies(cinemaHtml);
  console.log(`  ${cinema.length} film in programmazione`);

  const snapshot: UtilitySyncSnapshot = {
    editionId,
    territoryId: edition.territoryId,
    syncedAt: new Date().toISOString(),
    pharmacies: {
      sourceUrl: pharmacyUrl,
      sourceLabel: "Pagine Gialle",
      items: pharmacies,
    },
    cinema: {
      sourceUrl: cinemaUrl,
      sourceLabel: "MYmovies",
      items: cinema,
    },
  };

  const outputPath = options.outputPath ?? DEFAULT_OUTPUT;
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`✓ Salvato ${outputPath}`);

  return snapshot;
}
