@echo off
:loop
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
cd /d C:\dev\aurohub
npm run dev
timeout /t 3 /nobreak >nul
goto loop
