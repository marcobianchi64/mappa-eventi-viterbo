@echo off
cd /d "%~dp0..\.."
if not exist package.json (
  echo Errore: cartella progetto non trovata.
  pause
  exit /b 1
)
start http://localhost:5174
npm run dev
