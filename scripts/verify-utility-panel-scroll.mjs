#!/usr/bin/env node
/**
 * Verifica layout scroll pannelli utility (farmacie/cinema):
 * - altezza vincolata nel pannello
 * - overflow-y: auto sull'elenco
 * - thumb visibile solo quando c'è contenuto da scorrere
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { setTimeout as delay } from "node:timers/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const fixtureDir = resolve(root, "apps/web/.verify-fixtures");
const fixturePath = resolve(fixtureDir, "utility-panel-scroll.html");

function buildFixture() {
  const cssPath = resolve(root, "apps/web/src/styles/main.css");
  const css = readFileSync(cssPath, "utf8");
  const pharmacyItems = Array.from({ length: 23 }, (_, index) => `
    <a class="utility-sync-item" href="#">
      <strong class="utility-sync-item-title">Farmacia Test ${index + 1}</strong>
      <span class="utility-sync-item-meta">Comune · Via Roma · 0761 000000 · oggi 08:30-19:30</span>
    </a>
  `).join("");

  const cinemaItems = Array.from({ length: 2 }, (_, index) => `
    <article class="utility-cinema-venue-card">
      <strong class="utility-cinema-venue-title">Cinema ${index + 1} (Bolsena)</strong>
      <div class="utility-cinema-venue-films">
        <div class="utility-cinema-venue-film">
          <span class="utility-cinema-film-link">FILM ${index + 1}</span>
          <span class="utility-cinema-times">17:00, 21:30</span>
        </div>
      </div>
    </article>
  `).join("");

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Utility panel scroll fixture</title>
  <style>
    :root {
      --atlas-header-stack: 120px;
      --atlas-border: #e5e7eb;
      --shadow: 0 8px 28px rgba(15, 23, 42, 0.2);
      --panel-label-font: 18px;
      --legend-font: 16px;
      --chip-font: 16px;
    }
    body { margin: 0; font-family: system-ui, sans-serif; background: #eceff3; }
    ${css}
    .fixture-wrap { padding: 12px; display: grid; gap: 12px; }
    .fixture-wrap .utility-services-panel {
      position: relative !important;
      top: auto !important;
      bottom: auto !important;
      right: auto !important;
      left: auto !important;
      width: 100% !important;
      height: 70vh !important;
    }
    @media (min-width: 900px) {
      .fixture-wrap { grid-template-columns: 1fr 1fr; }
    }
  </style>
</head>
<body>
  <div class="fixture-wrap">
    <div id="pharmacyPanel" class="utility-services-panel utility-panel-pharmacy open">
      <h3>💊 Farmacie di turno oggi</h3>
      <div id="pharmacyPanelList" class="utility-panel-scroll">
        <div class="utility-services-list" data-utility-panel="pharmacy">
          <div class="utility-panel-sticky">
            <p class="utility-services-lead">Turno del <strong>oggi</strong> · 23 risultati</p>
            <div class="utility-panel-toolbar">
              <div class="utility-chip-row"><button type="button" class="utility-chip active">Tutte</button></div>
            </div>
          </div>
          <div class="utility-panel-scroll-body" id="pharmacyScrollBody">
            <div class="utility-sync-items">${pharmacyItems}</div>
          </div>
        </div>
      </div>
    </div>

    <div id="cinemaPanel" class="utility-services-panel utility-panel-cinema open">
      <h3>🎬 Cinema</h3>
      <div id="cinemaPanelList" class="utility-panel-scroll">
        <div class="utility-services-list" data-utility-panel="cinema">
          <div class="utility-panel-sticky">
            <p class="utility-services-lead">Provincia · aggiornato oggi</p>
            <div class="utility-panel-toolbar">
              <div class="utility-chip-row"><button type="button" class="utility-chip active">Per cinema</button></div>
            </div>
          </div>
          <div class="utility-panel-scroll-body" id="cinemaScrollBody">
            <div class="utility-cinema-venues">${cinemaItems}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

  mkdirSync(fixtureDir, { recursive: true });
  writeFileSync(fixturePath, html, "utf8");
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    const { execSync } = await import("node:child_process");
    execSync("npm install --no-save playwright@1.51.0", { stdio: "inherit" });
    return import("playwright");
  }
}

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const filePath = req.url === "/" ? fixturePath : resolve(fixtureDir, `.${req.url}`);
      const html = readFileSync(filePath, "utf8");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, url: `http://127.0.0.1:${address.port}/` });
    });
  });
}

async function main() {
  buildFixture();
  const { chromium } = await loadPlaywright();
  const serverInfo = await startStaticServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  try {
    await page.goto(serverInfo.url, { waitUntil: "load" });

    const metrics = await page.evaluate(() => {
      const read = (scrollBodyId) => {
        const scrollBody = document.getElementById(scrollBodyId);
        if (!scrollBody) return { ok: false, reason: `${scrollBodyId} mancante` };
        const style = getComputedStyle(scrollBody);
        return {
          ok: true,
          overflowY: style.overflowY,
          scrollHeight: scrollBody.scrollHeight,
          clientHeight: scrollBody.clientHeight,
          isScrollable: scrollBody.scrollHeight > scrollBody.clientHeight + 1,
        };
      };
      return {
        pharmacy: read("pharmacyScrollBody"),
        cinema: read("cinemaScrollBody"),
      };
    });

    if (!metrics.pharmacy.ok) throw new Error(metrics.pharmacy.reason);
    if (!metrics.cinema.ok) throw new Error(metrics.cinema.reason);

    if (metrics.pharmacy.overflowY !== "auto") {
      throw new Error(`Farmacie: overflow-y atteso auto, trovato ${metrics.pharmacy.overflowY}`);
    }
    if (!metrics.pharmacy.isScrollable) {
      throw new Error(
        `Farmacie: elenco non scrollabile (scrollHeight=${metrics.pharmacy.scrollHeight}, clientHeight=${metrics.pharmacy.clientHeight})`,
      );
    }

    if (metrics.cinema.overflowY !== "auto") {
      throw new Error(`Cinema: overflow-y atteso auto, trovato ${metrics.cinema.overflowY}`);
    }
    if (metrics.cinema.isScrollable) {
      throw new Error("Cinema: con 2 sale non deve risultare scrollabile");
    }

    await page.evaluate(() => {
      document.getElementById("pharmacyScrollBody").scrollTop = 9999;
    });
    await delay(50);
    const scrolled = await page.evaluate(
      () => document.getElementById("pharmacyScrollBody").scrollTop > 0,
    );
    if (!scrolled) throw new Error("Farmacie: scrollTop non cambia");

    console.log("✓ verify-utility-panel-scroll OK", metrics);
  } finally {
    await browser.close();
    serverInfo.server.close();
  }
}

main().catch((error) => {
  console.error("✗ verify-utility-panel-scroll FAILED:", error.message);
  process.exit(1);
});
