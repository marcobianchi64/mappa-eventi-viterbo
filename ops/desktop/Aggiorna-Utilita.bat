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
npm run sync:utilities
echo.
echo Fatto. Riavvia la mappa (Ctrl+C e npm run dev) e ricarica il browser con Ctrl+F5.
pause
