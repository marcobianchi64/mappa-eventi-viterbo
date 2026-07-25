@echo off
if exist "%~dp0atlas-progetto.txt" (
  set /p ATLAS_PROJECT=<"%~dp0atlas-progetto.txt"
) else (
  for %%I in ("%~dp0..\..") do set ATLAS_PROJECT=%%~fI
)
cd /d "%ATLAS_PROJECT%"
set /p CSV="Percorso file CSV (es. Desktop\eventi-ok.csv): "
npm run import:events -- --dry-run "%CSV%"
echo.
set /p OK="Import reale? (s/n): "
if /i "%OK%"=="s" npm run import:events -- "%CSV%"
pause
