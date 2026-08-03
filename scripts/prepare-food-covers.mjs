#!/usr/bin/env node
/**
 * Converte foto1.* … foto7.* in JPG pronti per la mappa (foto1.jpg … foto7.jpg).
 *
 * Uso:
 *   1. Copia le tue foto in apps/web/public/covers/food/ (foto1.png, foto2.jpg, …)
 *   2. npm run prepare:food-covers
 */
import { readdir, unlink, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FOOD_DIR = join(__dirname, "../apps/web/public/covers/food");
const COUNT = 7;

async function loadSharp() {
  try {
    const mod = await import("sharp");
    return mod.default;
  } catch {
    return null;
  }
}

function matchFoto(files, index) {
  const re = new RegExp(`^foto${index}$`, "i");
  return files.find((name) => re.test(name.replace(/\.[^.]+$/, "")));
}

async function main() {
  const files = await readdir(FOOD_DIR);
  const sharp = await loadSharp();
  let ok = 0;

  for (let i = 1; i <= COUNT; i++) {
    const srcName = matchFoto(files, i);
    const dest = join(FOOD_DIR, `foto${i}.jpg`);
    if (!srcName) {
      console.warn(`  foto${i} — file sorgente non trovato (atteso foto${i}.jpg/png/…)`);
      continue;
    }
    const src = join(FOOD_DIR, srcName);
    const ext = extname(srcName).toLowerCase();

    try {
      if (ext === ".jpg" || ext === ".jpeg") {
        if (srcName.toLowerCase() !== `foto${i}.jpg`) {
          const { copyFile } = await import("node:fs/promises");
          await copyFile(src, dest);
        }
      } else if (sharp) {
        const buf = await sharp(src)
          .rotate()
          .resize(1280, 720, { fit: "cover", position: "centre" })
          .jpeg({ quality: 85 })
          .toBuffer();
        await writeFile(dest, buf);
      } else {
        console.warn(
          `  foto${i} — formato ${ext}: salva come JPG oppure installa sharp (npm i -D sharp)`,
        );
        continue;
      }
      console.log(`  foto${i}.jpg ← ${srcName}`);
      ok++;
    } catch (e) {
      console.warn(`  foto${i} — errore: ${e.message}`);
    }
  }

  // Rimuovi vecchi file numerati 01.jpg … 10.jpg se presenti
  for (const name of files) {
    if (/^0\d\.jpg$/i.test(name)) {
      await unlink(join(FOOD_DIR, name)).catch(() => {});
      console.log(`  rimosso ${name} (formato vecchio)`);
    }
  }

  console.log(`\nCompletato: ${ok}/${COUNT} foto pronte in apps/web/public/covers/food/`);
  if (ok < COUNT) {
    console.log("Mancanti: aggiungi foto1 … foto7 nella cartella e rilancia.");
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
