@echo off
cd /d "%~dp0..\.."
set /p CSV="Percorso file CSV (es. Desktop\eventi-ok.csv): "
npm run import:events -- --dry-run "%CSV%"
echo.
set /p OK="Import reale? (s/n): "
if /i "%OK%"=="s" npm run import:events -- "%CSV%"
pause
