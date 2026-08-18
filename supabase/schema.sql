-- Project Atlas — schema eventi e policy RLS consigliate
-- Compatibile con la tabella esistente su Supabase

-- Estensione consigliata per ricerche geografiche future
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- Schema di riferimento (adatta se la tabella esiste già)
CREATE TABLE IF NOT EXISTS public.events (
  date_event TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('music', 'food', 'culture', 'sport', 'families', 'other')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  venue TEXT,
  event_url TEXT,
  image_url TEXT,
  description TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected')),
  source_id TEXT,
  territory_id TEXT,
  archived BOOLEAN NOT NULL DEFAULT false,
  promoted BOOLEAN NOT NULL DEFAULT false,
  external_url TEXT,
  slug TEXT,
  province TEXT,
  city TEXT,
  comune TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_verified_start
  ON public.events (verified, start_date);

CREATE INDEX IF NOT EXISTS idx_events_review_status
  ON public.events (review_status);

-- Abilita RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Lettura pubblica: solo eventi verificati
CREATE POLICY "events_public_read"
  ON public.events FOR SELECT
  USING (verified = true);

-- Inserimento pubblico: solo proposte non verificate
CREATE POLICY "events_public_insert"
  ON public.events FOR INSERT
  WITH CHECK (verified = false AND review_status = 'pending');

-- Moderazione: solo utenti autenticati (configura ruolo admin in Supabase)
CREATE POLICY "events_admin_update"
  ON public.events FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Admin: lettura eventi in pending
CREATE POLICY "events_admin_read_pending"
  ON public.events FOR SELECT
  USING (
    auth.role() = 'authenticated'
    OR verified = true
  );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS events_updated_at ON public.events;
CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
