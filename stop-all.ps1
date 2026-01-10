#!/usr/bin/env pwsh
# Script para parar todos os serviços do Agenda-SAAS

Write-Host "🛑 Parando todos os serviços do Agenda-SAAS..." -ForegroundColor Yellow

pm2 stop all

Write-Host "`n✅ Todos os serviços foram parados!" -ForegroundColor Green
Write-Host "Para reiniciar, execute: .\start-all.ps1" -ForegroundColor Cyan
