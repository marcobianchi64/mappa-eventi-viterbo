import "leaflet/dist/leaflet.css";
import "./styles/admin.css";
import { initSupabaseClient } from "@atlas/supabase-client";
import { AdminApp } from "./app";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  document.body.innerHTML = "<p>Configurazione Supabase mancante. Vedi apps/admin/.env.example</p>";
  throw new Error("Missing Supabase environment variables");
}

initSupabaseClient({ url, anonKey });
new AdminApp().start();
