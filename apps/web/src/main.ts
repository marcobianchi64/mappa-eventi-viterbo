import "leaflet/dist/leaflet.css";
import "../../../packages/core/styles/atlas-map-ui.css";
import "./styles/main.css";

import { applyMapUiScale } from "@atlas/core";
import { initSupabaseClient } from "@atlas/supabase-client";
import { AtlasApp } from "./app";

applyMapUiScale();

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  document.body.innerHTML = `
    <div style="padding:2rem;font-family:system-ui,sans-serif;max-width:520px;margin:auto">
      <h1>Configurazione mancante</h1>
      <p>Copia <code>apps/web/.env.example</code> in <code>apps/web/.env</code> e imposta le credenziali Supabase.</p>
    </div>
  `;
  throw new Error("Missing Supabase environment variables");
}

initSupabaseClient({ url, anonKey });
new AtlasApp().start();
