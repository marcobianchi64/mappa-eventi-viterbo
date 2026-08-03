#!/usr/bin/env node
/**
 * Copia e converte foto1…foto7 dalla cartella food-covers/ (root progetto)
 * verso apps/web/public/covers/food/foto1.jpg … foto7.jpg
 *
 * Uso:
 *   1. Metti le tue foto in food-covers/ (foto1.png, foto2.jpg, …)
 *   2. npm run prepare:food-covers
 */
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SOURCE_DIR = join(ROOT, "food-covers");
const DEST_DIR = join(ROOT, "apps/web/public/covers/food");
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
  await mkdir(SOURCE_DIR, { recursive: true });
  await mkdir(DEST_DIR, { recursive: true });

  let files;
  try {
    files = await readdir(SOURCE_DIR);
  } catch {
    files = [];
  }

  const sharp = await loadSharp();
  if (!sharp) {
    console.warn("Suggerimento: npm install -D sharp  (converte PNG/WebP in JPG)");
  }

  let ok = 0;
  console.log(`\nSorgente: food-covers/`);
  console.log(`Destinazione: apps/web/public/covers/food/\n`);

  for (let i = 1; i <= COUNT; i++) {
    const srcName = matchFoto(files, i);
    const dest = join(DEST_DIR, `foto${i}.jpg`);
    if (!srcName) {
      console.warn(`  ✗ foto${i} — non trovata in food-covers/`);
      continue;
    }
    const src = join(SOURCE_DIR, srcName);
    const ext = extname(srcName).toLowerCase();

    try {
      if (ext === ".jpg" || ext === ".jpeg") {
        const input = await sharp?.(src) ?? null;
        if (input) {
          const buf = await input.rotate().resize(1280, 720, { fit: "cover" }).jpeg({ quality: 85 }).toBuffer();
          await writeFile(dest, buf);
        } else {
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
        console.warn(`  ✗ foto${i} — ${ext}: installa sharp oppure salva come JPG`);
        continue;
      }
      console.log(`  ✓ foto${i}.jpg ← food-covers/${srcName}`);
      ok++;
    } catch (e) {
      console.warn(`  ✗ foto${i} — errore: ${e.message}`);
    }
  }

  console.log(`\nRisultato: ${ok}/${COUNT} foto installate.`);
  if (ok === 0) {
    console.log(`
Nessuna foto trovata. Passi:
  1. Apri la cartella food-covers/ nella root del progetto
     (accanto a package.json, NON dentro apps/)
  2. Copia qui foto1, foto2, … foto7 (jpg o png)
  3. Rilancia: npm run prepare:food-covers
`);
    process.exitCode = 1;
  } else if (ok < COUNT) {
    console.log("Alcune foto mancano: controlla i nomi (foto1, foto2, … foto7).");
    process.exitCode = 1;
  } else {
    console.log("OK — riavvia npm run dev e fai Ctrl+Shift+R nel browser.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
