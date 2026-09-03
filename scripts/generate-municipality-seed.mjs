#!/usr/bin/env node
/** Genera supabase/seed_municipalities_vt.sql dall'elenco comuni del geocoder. */
import { writeFile } from "node:fs/promises";
import { getComuneCenterByKey, listViterboComuni } from "@atlas/core";

const MINOR_WORDS = new Set(["di", "in", "del", "della", "dei", "sul", "e", "a"]);

function displayName(key) {
  return key
    .split(" ")
    .map((word, index) => {
      if (index > 0 && MINOR_WORDS.has(word)) return word;
      if (word.includes("'")) {
        const [head, tail] = word.split("'");
        return `${head.charAt(0).toUpperCase()}${head.slice(1)}'${tail ? tail.charAt(0).toUpperCase() + tail.slice(1) : ""}`;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function slug(key) {
  return key.replace(/'/g, "").replace(/[^a-z0-9]+/g, "-");
}

const rows = listViterboComuni().map((key) => {
  const center = getComuneCenterByKey(key);
  const name = displayName(key);
  return `  ('place-municipality-${slug(key)}', ${sql(`Comune di ${name}`)}, 'municipality', 'IT-VT', ${sql(name)}, NULL, ${center ? center.lat : "NULL"}, ${center ? center.lng : "NULL"}, 'active', NULL, '{}'::jsonb, 'Elenco comuni provincia di Viterbo (geocoder Atlas)', CURRENT_DATE, 'Referente istituzionale: contatti da censire')`;
});

function sql(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

const output = `-- Generato da scripts/generate-municipality-seed.mjs — comuni provincia di Viterbo.
INSERT INTO public.places (
  id, name, place_type, territory_id, municipality, address, lat, lng, status,
  primary_source_id, external_refs, registry_source, registry_observed_at, notes
) VALUES
${rows.join(",\n")}
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  municipality = EXCLUDED.municipality,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  registry_source = EXCLUDED.registry_source;
`;

await writeFile(new URL("../supabase/seed_municipalities_vt.sql", import.meta.url), output, "utf8");
console.log(`✓ Generati ${rows.length} comuni in supabase/seed_municipalities_vt.sql`);
