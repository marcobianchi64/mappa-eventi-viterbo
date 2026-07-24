@echo off
set DESKTOP=%USERPROFILE%\Desktop
set TARGET=%DESKTOP%\Atlas Operazioni

for %%I in ("%~dp0..\..") do set ATLAS_PROJECT=%%~fI

echo Creazione cartella: %TARGET%
if not exist "%TARGET%" mkdir "%TARGET%"

echo Copia strumenti...
xcopy /Y /E /I "%~dp0*" "%TARGET%\"

echo %ATLAS_PROJECT%> "%TARGET%\atlas-progetto.txt"

echo.
echo Progetto collegato: %ATLAS_PROJECT%
echo Fatto. Apri "%TARGET%\APRI-QUESTO.html"
echo.
pause
