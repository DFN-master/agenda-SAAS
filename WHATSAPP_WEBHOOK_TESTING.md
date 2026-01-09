# 🚀 WhatsApp AI Integration - Testing Guide

## ✅ Webhook Integration Completed

### O que foi implementado:

1. **WhatsApp Message Listener** - whatsapp-service agora detecta mensagens recebidas
2. **AI Backend Trigger** - Quando uma mensagem chega, automaticamente chama `/api/ai/suggestions`
3. **Company & User Context** - O webhook passa `companyId` e `userToken` para isolamento SaaS
4. **Frontend Update** - Integrations.jsx agora envia `companyId` ao criar conexão

### Fluxo Completo:

```
1. Usuário escaneia QR Code WhatsApp
   ↓
2. Mensagem chega no WhatsApp
   ↓
3. Baileys socket.ev.on('messages.upsert') detecta
   ↓
4. sendMessageToAIBackend() é chamado
   ↓
5. POST http://localhost:3000/api/ai/suggestions
   {
     company_id: uuid,
     connection_id: uuid,
     client_ref: phone_number,
     incoming_message: "Olá, como você tá?"
   }
   ↓
6. Backend cria sugestão com IA
   ↓
7. Admin vê em "Treinamento IA" → aprova/rejeita
   ↓
8. Confiança aumenta (training score)
```

## 📋 Como Testar (Passo a Passo)

### Pré-requisitos:
- ✅ Backend rodando (3000)
- ✅ Frontend rodando (5173)
- ✅ WhatsApp-Service rodando (4000)
- ✅ AI-Service rodando (5000)
- ✅ PostgreSQL com migrations aplicadas

### Teste 1: Criar Conexão WhatsApp

1. Acesse: `http://localhost:5173/integrations`
2. Clique em "Adicionar Conexão WhatsApp"
3. Selecione "WhatsApp" → Clique "Conectar"
4. **QR Code deve aparecer** (verde, pronto para scanear)
5. Abra seu WhatsApp no celular
6. Vá em **Configurações → Dispositivos Vinculados → Vincular Dispositivo**
7. Escaneie o QR Code
8. ✅ Deve aparecer "Conectado! Número do WhatsApp: +55..."

### Teste 2: Enviar Mensagem (Webhook)

**Cenário**: Amigo envia uma mensagem WhatsApp para você

1. De outro celular/conta, envie uma mensagem:
   - Ex: "Olá, qual é o horário de atendimento?"
2. **Verifique no terminal do whatsapp-service**:
   ```
   [2025-01-10T...] 📨 Mensagem recebida de +55119999999: "Olá, qual é..."
   [2025-01-10T...] 📤 Enviando mensagem para AI backend...
   [2025-01-10T...] ✅ Sugestão criada com ID: xxxxx
   ```
3. ✅ Webhook foi acionado!

### Teste 3: Ver Sugestão no Admin

1. **Se você for super_admin**:
   - Acesse: `http://localhost:5173/admin`
   - Tab: **"🤖 Treinamento IA"**
   - Deve ver a sugestão pendente

2. **Se você for usuário comum**:
   - Sistema ainda em desenvolvimento para usuários normais
   - Super admin vê e aprova as sugestões

### Teste 4: Aprovar Sugestão (Training)

1. No painel de Treinamento IA
2. Clique na sugestão pendente (expande)
3. Veja:
   - 📩 Mensagem recebida
   - 💬 Sugestão de resposta gerada
   - 📋 Contexto da conversa
4. Clique **"✓ Aprovar"** (com response sugerida)
5. ✅ Deve aparecer:
   - "Sugestão aprovada!"
   - Total de Aprovações aumenta
   - Nível de Confiança aumenta

### Teste 5: Rejeitar Sugestão

1. Crie outra sugestão (envie nova mensagem)
2. No painel, clique para expandir
3. Digite feedback (opcional): "Resposta genérica demais"
4. Clique **"✗ Rejeitar"**
5. ✅ Sugestão desaparece da lista

### Teste 6: Auto-Resposta

1. Após 3+ aprovações, confiança deve estar > 50%
2. Clique no botão **"○ Desativada"** (ao lado de "Auto-Resposta")
3. Muda para **"✓ Ativada"** (verde)
4. Próximas mensagens com confiança > 70% serão:
   - Auto-respondidas (sem aprovação manual)
   - Registradas como 'auto_sent' no sistema

## 🔍 Troubleshooting

### ❌ "Erro ao gerar QR Code"
- Verifique se whatsapp-service está rodando: `pm2 logs whatsapp-service`
- Verifique se `companyId` está sendo passado
- Verifique se usuário está associado a uma empresa

### ❌ "Webhook não é acionado"
- Mensagem foi enviada como **texto simples** (não sticker/mídia)?
- Verifique logs: `pm2 logs whatsapp-service | grep "Mensagem recebida"`
- Verifique se backend está acessível: `curl http://localhost:3000/api/ai/suggestions -X GET`

### ❌ "Sugestão não aparece no painel"
- Verifique se `company_id` na sugestão = `company_id` do usuário
- Confira logs do backend: `pm2 logs agenda-backend`
- Tente refresh da página (F5)

### ⚠️ "QR Code expirou"
- Normal! WhatsApp expira QR code após ~60s
- Clique "Conectar" novamente para novo QR
- Sistema reconecta automaticamente e gera novo QR

## 📊 Monitoramento em Tempo Real

### Ver logs do whatsapp-service:
```bash
pm2 logs whatsapp-service
# Ou para última hora:
pm2 logs whatsapp-service --lines 50
```

### Ver logs do backend:
```bash
pm2 logs agenda-backend
```

### Ver logs do frontend:
```bash
pm2 logs agenda-frontend
```

### Status de todos os serviços:
```bash
pm2 status
```

## 🎯 Checklist de Validação

- [ ] WhatsApp-Service está online
- [ ] QR Code gerado com sucesso
- [ ] WhatsApp conectado (mostra número)
- [ ] Mensagem recebida é detectada (logs mostram)
- [ ] Webhook envia para backend (logs mostram "Enviando para AI backend")
- [ ] Sugestão criada (logs mostram ID)
- [ ] Sugestão aparece no painel Admin
- [ ] Pode aprovar sugestão
- [ ] Confiança aumenta após aprovação
- [ ] Pode rejeitar com feedback
- [ ] Pode ativar auto-resposta
- [ ] Auto-resposta funciona em nova mensagem

## 🔧 Próximos Passos

1. **Auto-Resposta Automática** - Implementar envio automático quando confiança > 70%
2. **Email Integration** - Aplicar mesmo webhook para emails
3. **Analytics Dashboard** - Mostrar métricas de treinamento
4. **Batch Operations** - Aprovar múltiplas sugestões de uma vez
5. **Feedback Loop** - Enviar feedback para retreinar modelo IA local

---

**Status**: ✅ Webhook integrado e testável
**Último Update**: 2025-01-10
**Próximo Milestone**: Auto-resposta automática
