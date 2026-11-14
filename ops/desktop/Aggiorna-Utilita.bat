@echo off
if exist "%~dp0atlas-progetto.txt" (
  set /p ATLAS_PROJECT=<"%~dp0atlas-progetto.txt"
) else (
  for %%I in ("%~dp0..\..") do set ATLAS_PROJECT=%%~fI
)
cd /d "%ATLAS_PROJECT%"
if not exist package.json (
  echo Errore: cartella progetto non trovata.
  pause
  exit /b 1
)
echo Aggiornamento farmacie e cinema (Pagine Gialle + MYmovies)...
echo Se hai packages\collector\.env con SUPABASE_SERVICE_ROLE_KEY, il turno va anche su Supabase (mappa aggiornata subito).
npm run sync:utilities
echo.
echo Fatto. Ricarica la mappa con Ctrl+F5 (non serve riavviare il dev server).
pause
