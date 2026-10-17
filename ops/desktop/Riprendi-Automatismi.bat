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
if not exist packages\collector\.env (
  echo.
  echo MANCA packages\collector\.env
  echo Copia packages\collector\.env.example in packages\collector\.env
  echo e inserisci SUPABASE_SERVICE_ROLE_KEY da Supabase - Settings - API.
  echo.
  pause
  exit /b 1
)

echo === 1/2 Farmacie e cinema ===
call npm run sync:utilities
if errorlevel 1 (
  echo Errore sync utilita.
  pause
  exit /b 1
)

echo.
echo === 2/2 Raccolta eventi automatica ===
call npm run collect
if errorlevel 1 (
  echo Errore collect. Controlla la chiave service_role nel file .env del collector.
  pause
  exit /b 1
)

echo.
echo Completato. Apri la mappa e il Control Center, poi Ctrl+F5 nel browser.
pause
