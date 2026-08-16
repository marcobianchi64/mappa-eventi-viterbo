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
start http://localhost:5174
npm run dev
