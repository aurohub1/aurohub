@echo off
echo Iniciando Aurohub dev server...
cd /d C:\dev\aurohub
:loop
npm run dev
echo Servidor caiu, reiniciando em 3 segundos...
timeout /t 3
goto loop
