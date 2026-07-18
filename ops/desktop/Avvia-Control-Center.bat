@echo off
cd /d "%~dp0..\.."
if not exist package.json (
  echo Errore: esegui installa-sul-desktop.bat prima, oppure apri da cartella progetto.
  pause
  exit /b 1
)
start http://localhost:5173
npm run dev:admin
