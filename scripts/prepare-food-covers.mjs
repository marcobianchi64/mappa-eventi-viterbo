#!/usr/bin/env node
/**
 * Installa le foto enogastronomia nell'app.
 * Accetta nomi tipo: foto1, foto 1, Foto1.png, foto_1.jpg …
 * Cerca in food-covers/ e in apps/web/public/covers/food/
 */
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DEST_DIR = join(ROOT, "apps/web/public/covers/food");
const SOURCE_DIRS = [
  join(ROOT, "food-covers"),
  join(ROOT, "apps/web/public/covers/food"),
];
const COUNT = 7;
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"]);

async function loadSharp() {
  try {
    const mod = await import("sharp");
    return mod.default;
  } catch {
    return null;
  }
}

/** "foto 8", "foto8", "Foto_3" → numero */
function fotoNumber(filename) {
  const base = filename.replace(/\.[^.]+$/, "").trim();
  const m = base.match(/^foto[\s_-]*(\d+)$/i);
  return m ? Number(m[1]) : null;
}

async function collectSourceFiles() {
  const byNum = new Map();
  for (const dir of SOURCE_DIRS) {
    let names;
    try {
      names = await readdir(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      const ext = extname(name).toLowerCase();
      if (!IMAGE_EXT.has(ext)) continue;
      const num = fotoNumber(name);
      if (num == null) continue;
      if (!byNum.has(num)) {
        byNum.set(num, { dir, name, num });
      }
    }
  }
  return [...byNum.values()].sort((a, b) => a.num - b.num);
}

async function writeJpeg(sharp, src, dest) {
  const buf = await sharp(src).rotate().resize(1280, 720, { fit: "cover" }).jpeg({ quality: 85 }).toBuffer();
  await writeFile(dest, buf);
}

async function main() {
  await mkdir(DEST_DIR, { recursive: true });
  const sharp = await loadSharp();
  const sources = await collectSourceFiles();

  console.log("\nFoto enogastronomia → apps/web/public/covers/food/\n");

  if (sources.length === 0) {
    console.log(`Nessuna foto trovata. Metti file tipo "foto1" o "foto 1" in:`);
    for (const d of SOURCE_DIRS) console.log(`  - ${d}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Trovate ${sources.length} immagini: ${sources.map((s) => s.name).join(", ")}\n`);

  const picked = sources.slice(0, COUNT);
  if (sources.length < COUNT) {
    console.warn(`Attenzione: servono ${COUNT} foto, ne hai ${sources.length}.`);
  }

  let ok = 0;
  for (let slot = 1; slot <= picked.length; slot++) {
    const { dir, name } = picked[slot - 1];
    const src = join(dir, name);
    const dest = join(DEST_DIR, `foto${slot}.jpg`);
    const ext = extname(name).toLowerCase();

    try {
      if ((ext === ".jpg" || ext === ".jpeg") && sharp) {
        await writeJpeg(sharp, src, dest);
      } else if (ext === ".jpg" || ext === ".jpeg") {
        const { copyFile } = await import("node:fs/promises");
        await copyFile(src, dest);
      } else if (sharp) {
        await writeJpeg(sharp, src, dest);
      } else {
        console.warn(`  ✗ foto${slot} ← ${name}: installa sharp (npm install) per convertire ${ext}`);
        continue;
      }
      console.log(`  ✓ foto${slot}.jpg ← ${name}`);
      ok++;
    } catch (e) {
      console.warn(`  ✗ foto${slot} ← ${name}: ${e.message}`);
    }
  }

  console.log(`\nRisultato: ${ok}/${COUNT} foto installate.`);
  if (ok > 0) {
    console.log("Riavvia npm run dev e fai Ctrl+Shift+R nel browser.");
  }
  if (ok < COUNT) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
