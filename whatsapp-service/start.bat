@echo off
cd /d D:\Agenda-Sys\whatsapp-service
start /B npx tsx src/index.ts > logs\whatsapp-out.log 2>&1
echo WhatsApp Service iniciado em background
