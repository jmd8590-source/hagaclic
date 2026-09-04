@echo off
title HagaClic - Asistente de Tramites Espana
chcp 65001 > nul
echo ========================================================
echo         HagaClic - Asistente de Tramites Espana
echo ========================================================
echo.
echo Iniciando el servidor local...
echo La aplicacion estara disponible en: http://localhost:5000
echo.

:: Abrir el navegador automaticamente tras 2 segundos
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:5000"

:: Iniciar aplicacion Flask
python app.py

pause
