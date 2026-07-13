# mappa-eventi-viterbo (Project Atlas)

Local events map for Viterbo and its province (Italian UI). It is a static, zero-build,
zero-dependency site: two hand-written HTML files that talk directly to a hosted Supabase
project (URL + anon key are hardcoded in the HTML).

- `index.html` — public map (Leaflet + OpenStreetMap). Browse/filter/search verified events,
  save events to `localStorage`, and submit new events for review.
- `control-center.html` — admin/moderation dashboard. Approve/reject pending submissions.

## Cursor Cloud specific instructions

- No package manager, build step, lint, or test tooling exists (no `package.json`, lockfile,
  Makefile, etc.). There is nothing to install; the update script is intentionally a no-op.
- Third-party libs (Leaflet, `@supabase/supabase-js`) and map tiles load from CDNs at runtime,
  so a working session needs outbound internet access.
- Run the site with any static file server from the repo root, e.g. `python3 -m http.server 8000`,
  then open `http://localhost:8000/index.html` and `http://localhost:8000/control-center.html`.
  Do not open via `file://` — geolocation and other secure-context features won't work.
- Backend is a remote hosted Supabase project (`events` table via PostgREST + Auth). There is no
  local backend/database to start.
- The embedded anon key is subject to row-level security: the public map can only READ
  `verified = true` events. Newly submitted events are stored as `verified = false` /
  `review_status = "pending"` and are intentionally NOT readable with the anon key — so you
  cannot confirm a submission by re-querying `/rest/v1/events` as anon. A successful submit is
  indicated by the in-app green status ("Evento inviato...") / a `201` from `POST /rest/v1/events`.
- `control-center.html` login is Supabase magic-link email OTP (`signInWithOtp`). Fully testing
  the admin approve/reject flow requires access to a real admin mailbox to click the login link;
  it cannot be exercised end-to-end without those credentials.
