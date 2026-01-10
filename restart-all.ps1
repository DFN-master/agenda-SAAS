#!/usr/bin/env pwsh
# Script para reiniciar todos os serviços do Agenda-SAAS

Write-Host "🔄 Reiniciando todos os serviços do Agenda-SAAS..." -ForegroundColor Cyan

pm2 restart all

Start-Sleep -Seconds 3

Write-Host "`n✅ Status dos serviços:" -ForegroundColor Green
pm2 status

Write-Host "`n✨ Todos os serviços foram reiniciados!" -ForegroundColor Green
