import "leaflet/dist/leaflet.css";
import "../../../packages/core/styles/atlas-map-ui.css";
import "./styles/main.css";

import { escapeHtml, injectAtlasTypography } from "@atlas/core";
import { initSupabaseClient } from "@atlas/supabase-client";
import { AtlasApp } from "./app";

function showBootError(message: string): void {
  const root = document.getElementById("app");
  const html = `
    <div style="padding:2rem;font-family:system-ui,sans-serif;max-width:560px;margin:auto;line-height:1.5">
      <h1 style="margin-top:0">Mappa non avviata</h1>
      <p>${escapeHtml(message)}</p>
      <p style="color:#555;font-size:0.95rem">
        Controlla che la <strong>finestra 2</strong> abbia <code>npm run dev</code> in esecuzione
        e apri l’URL indicato nel terminale (es. <code>http://localhost:5173</code>).
      </p>
    </div>
  `;
  if (root) root.innerHTML = html;
  else document.body.innerHTML = html;
}

function boot(): void {
  try {
    injectAtlasTypography();
  } catch (error) {
    console.error("injectAtlasTypography:", error);
  }

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    showBootError(
      "Configurazione Supabase mancante. Copia apps/web/.env.example in apps/web/.env e imposta VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.",
    );
    return;
  }

  try {
    initSupabaseClient({ url, anonKey });
    new AtlasApp().start();
  } catch (error) {
    console.error(error);
    showBootError((error as Error).message || String(error));
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
