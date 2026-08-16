#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DATASET_URL = "https://www.dati.salute.gov.it/sites/default/files/opendata/FRM_FARMA_5_20260816.csv";
const OBSERVED_AT = "2026-08-16";
const __dirname = dirname(fileURLToPath(import.meta.url));
const coreOutput = resolve(__dirname, "../../../core/src/atlas-pharmacy-catalog.generated.ts");
const seedOutput = resolve(__dirname, "../../../../supabase/seed_pharmacies_vt.sql");

interface MinistryPharmacyRow {
  cod_farmacia: string;
  indirizzo: string;
  descrizione_farmacia: string;
  cap: string;
  comune: string;
  sigla_provincia: string;
  data_fine_validita: string;
  latitudine: string;
  longitudine: string;
}

function parseCsv(text: string): MinistryPharmacyRow[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = lines.shift()?.split(";") ?? [];
  return lines.map((line) => {
    const values = line.split(";");
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])) as unknown as MinistryPharmacyRow;
  });
}

function sql(value: string | null): string {
  return value === null ? "NULL" : `'${value.replace(/'/g, "''")}'`;
}

function ts(value: string): string {
  return JSON.stringify(value);
}

async function main(): Promise<void> {
  const response = await fetch(DATASET_URL);
  if (!response.ok) throw new Error(`Download Ministero fallito: HTTP ${response.status}`);
  const rows = parseCsv(await response.text())
    .filter((row) => row.sigla_provincia === "VT" && row.data_fine_validita === "-")
    .sort((a, b) => a.comune.localeCompare(b.comune, "it") || a.descrizione_farmacia.localeCompare(b.descrizione_farmacia, "it"));

  const unique = [...new Map(rows.map((row) => [row.cod_farmacia, row])).values()];
  if (unique.length < 80) throw new Error(`Registro Ministero inatteso: solo ${unique.length} farmacie VT attive`);

  const generated = `// Generato da import-pharmacy-registry.ts — non modificare a mano.\n` +
    `import type { AtlasPlaceRegistryEntry } from "./atlas-registry.js";\n\n` +
    `export const ATLAS_PHARMACY_PLACES_VT_DATA: AtlasPlaceRegistryEntry[] = [\n` +
    unique.map((row) => {
      const address = [row.indirizzo, row.cap, row.comune].filter((part) => part && part !== "-").join(" - ");
      return `  {\n` +
        `    id: ${ts(`place-pharmacy-ministero-${row.cod_farmacia}`)},\n` +
        `    name: ${ts(row.descrizione_farmacia)},\n` +
        `    placeType: "pharmacy",\n    territoryId: "IT-VT",\n` +
        `    municipality: ${ts(row.comune)},\n    address: ${ts(address)},\n` +
        `    status: "active",\n    primarySourceId: "src-ministero-pharmacy-it",\n` +
        `    externalRefs: { ministero: { cim: ${ts(row.cod_farmacia)}, url: ${ts(DATASET_URL)} } },\n` +
        `    notes: "Registro Ministero della Salute, osservato ${OBSERVED_AT}",\n  }`;
    }).join(",\n") +
    `\n];\n`;

  const seed = `-- Generato da import-pharmacy-registry.ts — fonte: Ministero della Salute.\n` +
    `INSERT INTO public.places (\n  id, name, place_type, territory_id, municipality, address, status,\n  primary_source_id, external_refs, registry_source, registry_observed_at, notes\n) VALUES\n` +
    unique.map((row) => {
      const address = [row.indirizzo, row.cap, row.comune].filter((part) => part && part !== "-").join(" - ");
      return `  (${sql(`place-pharmacy-ministero-${row.cod_farmacia}`)}, ${sql(row.descrizione_farmacia)}, 'pharmacy', 'IT-VT', ${sql(row.comune)}, ${sql(address)}, 'active', 'src-ministero-pharmacy-it', '{"ministero":{"cim":"${row.cod_farmacia}","url":"${DATASET_URL}"}}'::jsonb, 'Ministero della Salute', DATE '${OBSERVED_AT}', ${sql(`Registro Ministero della Salute, osservato ${OBSERVED_AT}`)})`;
    }).join(",\n") +
    `\nON CONFLICT (id) DO UPDATE SET\n  name = EXCLUDED.name,\n  municipality = EXCLUDED.municipality,\n  address = EXCLUDED.address,\n  status = EXCLUDED.status,\n  external_refs = EXCLUDED.external_refs,\n  registry_source = EXCLUDED.registry_source,\n  registry_observed_at = EXCLUDED.registry_observed_at,\n  notes = EXCLUDED.notes;\n`;

  await mkdir(dirname(coreOutput), { recursive: true });
  await writeFile(coreOutput, generated, "utf8");
  await mkdir(dirname(seedOutput), { recursive: true });
  await writeFile(seedOutput, seed, "utf8");
  console.log(`✓ Importate ${unique.length} farmacie attive della provincia di Viterbo`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
