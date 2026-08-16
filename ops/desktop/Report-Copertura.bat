@echo off
if exist "%~dp0atlas-progetto.txt" (
  set /p ATLAS_PROJECT=<"%~dp0atlas-progetto.txt"
) else (
  for %%I in ("%~dp0..\..") do set ATLAS_PROJECT=%%~fI
)
cd /d "%ATLAS_PROJECT%"
npm run report:gap
pause
