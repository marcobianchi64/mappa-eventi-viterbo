# Cover enogastronomia

Cartella per le **7 foto sostitutive** degli eventi food senza locandina reale.

## Passi (Windows / Git Bash)

1. **Ferma** `npm run dev` (Ctrl+C) — altrimenti i file restano bloccati.
2. Apri **questa** cartella (non `dist/`):
   `apps/web/public/covers/food/`
3. Esegui `git pull` per rimuovere le vecchie foto dal repo.
4. Copia qui le tue immagini come `foto1`, `foto2`, … `foto7` (jpg, png o webp).
5. Dalla root del progetto:
   ```bash
   npm run prepare:food-covers
   npm run dev
   ```
6. Nel browser: **Ctrl+Shift+R**

## Nomi file attesi dall'app

`foto1.jpg` … `foto7.jpg` (creati dallo script se partono da png/jpg con altro nome).

## Didascalia

In basso compare: **foto sostitutiva provvisoria**

## Altre categorie

Musica, cultura, sport, famiglie, altri → icona colorata (nessuna foto in questa cartella).
