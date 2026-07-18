@echo off
set DESKTOP=%USERPROFILE%\Desktop
set TARGET=%DESKTOP%\Atlas Operazioni

echo Creazione cartella: %TARGET%
if not exist "%TARGET%" mkdir "%TARGET%"

echo Copia strumenti...
xcopy /Y /E /I "%~dp0*" "%TARGET%\"

echo.
echo Fatto. Apri "%TARGET%\APRI-QUESTO.html"
echo.
pause
