#!/usr/bin/env pwsh
# Script para iniciar todos os serviços do Agenda-SAAS

Write-Host "🚀 Iniciando todos os serviços do Agenda-SAAS..." -ForegroundColor Green

# Parar todos os processos existentes
Write-Host "`n📛 Parando processos existentes..." -ForegroundColor Yellow
pm2 delete all 2>$null

# Aguardar um pouco
Start-Sleep -Seconds 2

# Iniciar todos os serviços usando ecosystem.config.js
Write-Host "`n🔄 Iniciando serviços..." -ForegroundColor Cyan
pm2 start ecosystem.config.js

# Aguardar inicialização
Start-Sleep -Seconds 3

# Mostrar status
Write-Host "`n✅ Status dos serviços:" -ForegroundColor Green
pm2 status

# Mostrar logs
Write-Host "`n📋 Para ver os logs, use:" -ForegroundColor Cyan
Write-Host "   pm2 logs               # Ver todos os logs"
Write-Host "   pm2 logs agenda-backend      # Ver logs do backend"
Write-Host "   pm2 logs agenda-frontend     # Ver logs do frontend"
Write-Host "   pm2 logs whatsmeow           # Ver logs do WhatsApp"
Write-Host "   pm2 logs cognitive-engine    # Ver logs da IA"

Write-Host "`n🎯 Serviços disponíveis:" -ForegroundColor Green
Write-Host "   Backend:         http://localhost:3000"
Write-Host "   Frontend:        http://localhost:5173"
Write-Host "   Whatsmeow:       http://localhost:4000"
Write-Host "   WhatsApp Service: http://localhost:4001"
Write-Host "   Cognitive Engine: http://localhost:5001"

Write-Host "`n✨ Todos os serviços foram iniciados!" -ForegroundColor Green
