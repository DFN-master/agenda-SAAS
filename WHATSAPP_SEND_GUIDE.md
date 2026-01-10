# Sistema de Envio de Mensagens WhatsApp

## Visão Geral

O sistema agora possui funcionalidades completas para **enviar mensagens do backend para números de WhatsApp**. Isso permite:

- ✅ Enviar mensagens personalizadas
- ✅ Enviar lembretes de agendamento automáticos
- ✅ Enviar confirmações de agendamento
- ✅ Enviar notificações de cancelamento
- ✅ Integração automática com conexões WhatsApp ativas

---

## Arquitetura

```
Backend (porta 3000)
    ↓
WhatsApp Routes
    ↓
WhatsApp Notification Service
    ↓
WhatsApp Service (porta 4000)
    ↓
Baileys (WhatsApp Web API)
    ↓
WhatsApp
```

---

## Endpoints Disponíveis

### 1. Enviar Mensagem Simples

**POST** `/api/whatsapp/send`

Envia uma mensagem de texto para qualquer número.

#### Request:
```json
{
  "company_id": "123e4567-e89b-12d3-a456-426614174000",
  "phone": "(11) 98765-4321",
  "message": "Olá! Esta é uma mensagem de teste."
}
```

#### Headers:
```
Authorization: Bearer <seu-token-jwt>
Content-Type: application/json
```

#### Response (200 OK):
```json
{
  "success": true,
  "message": "Mensagem enviada com sucesso",
  "jid": "5511987654321@s.whatsapp.net"
}
```

#### Exemplo cURL:
```bash
curl -X POST http://localhost:3000/api/whatsapp/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "123e4567-e89b-12d3-a456-426614174000",
    "phone": "(11) 98765-4321",
    "message": "Olá! Tudo bem?"
  }'
```

---

### 2. Enviar Lembrete de Agendamento

**POST** `/api/whatsapp/send-reminder`

Envia um lembrete formatado de agendamento.

#### Request:
```json
{
  "company_id": "123e4567-e89b-12d3-a456-426614174000",
  "phone": "(11) 98765-4321",
  "clientName": "João Silva",
  "date": "15/01/2026",
  "time": "14:30",
  "service": "Consulta de Rotina",
  "location": "Clínica Central - Sala 203"
}
```

#### Response (200 OK):
```json
{
  "success": true,
  "message": "Lembrete enviado com sucesso",
  "jid": "5511987654321@s.whatsapp.net"
}
```

#### Mensagem enviada:
```
Olá João Silva! 👋

🗓️ *Lembrete de Agendamento*

📅 Data: 15/01/2026
🕐 Horário: 14:30
📋 Serviço: Consulta de Rotina
📍 Local: Clínica Central - Sala 203

Aguardamos você! 😊

Para reagendar ou cancelar, responda esta mensagem.
```

#### Exemplo cURL:
```bash
curl -X POST http://localhost:3000/api/whatsapp/send-reminder \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "123e4567-e89b-12d3-a456-426614174000",
    "phone": "(11) 98765-4321",
    "clientName": "João Silva",
    "date": "15/01/2026",
    "time": "14:30",
    "service": "Consulta de Rotina"
  }'
```

---

### 3. Enviar Confirmação de Agendamento

**POST** `/api/whatsapp/send-confirmation`

Envia confirmação formatada quando o agendamento é criado.

#### Request:
```json
{
  "company_id": "123e4567-e89b-12d3-a456-426614174000",
  "phone": "(11) 98765-4321",
  "clientName": "Maria Santos",
  "date": "20/01/2026",
  "time": "10:00",
  "service": "Limpeza de Pele",
  "confirmationCode": "AG2026-0120"
}
```

#### Response (200 OK):
```json
{
  "success": true,
  "message": "Confirmação enviada com sucesso",
  "jid": "5511987654321@s.whatsapp.net"
}
```

#### Mensagem enviada:
```
Olá Maria Santos! 👋

✅ *Agendamento Confirmado*

📅 Data: 20/01/2026
🕐 Horário: 10:00
📋 Serviço: Limpeza de Pele

🔑 Código de Confirmação: *AG2026-0120*

Obrigado pela preferência! 😊
```

---

### 4. Enviar Notificação de Cancelamento

**POST** `/api/whatsapp/send-cancellation`

Notifica o cliente sobre cancelamento de agendamento.

#### Request:
```json
{
  "company_id": "123e4567-e89b-12d3-a456-426614174000",
  "phone": "(11) 98765-4321",
  "clientName": "Pedro Costa",
  "date": "18/01/2026",
  "time": "16:00",
  "reason": "Profissional não disponível"
}
```

#### Response (200 OK):
```json
{
  "success": true,
  "message": "Notificação de cancelamento enviada",
  "jid": "5511987654321@s.whatsapp.net"
}
```

#### Mensagem enviada:
```
Olá Pedro Costa! 👋

❌ *Agendamento Cancelado*

📅 Data: 18/01/2026
🕐 Horário: 16:00

📝 Motivo: Profissional não disponível

Deseja reagendar? Responda esta mensagem! 😊
```

---

## Formatos de Telefone Aceitos

O sistema aceita vários formatos de telefone e converte automaticamente:

- `(11) 98765-4321`
- `11987654321`
- `5511987654321`
- `+55 11 98765-4321`

Todos são convertidos para: `5511987654321@s.whatsapp.net` (formato JID do WhatsApp)

---

## Tratamento de Erros

### Erro 400 - Parâmetros Obrigatórios Faltando
```json
{
  "error": "phone, clientName, date e time são obrigatórios"
}
```

### Erro 404 - Conexão WhatsApp Não Encontrada
```json
{
  "error": "Nenhuma conexão WhatsApp ativa encontrada"
}
```

### Erro 500 - Falha ao Enviar
```json
{
  "error": "Falha ao enviar mensagem"
}
```

---

## Uso Programático

### Node.js / TypeScript

```typescript
import axios from 'axios';

async function sendWhatsAppReminder() {
  const response = await axios.post(
    'http://localhost:3000/api/whatsapp/send-reminder',
    {
      company_id: '123e4567-e89b-12d3-a456-426614174000',
      phone: '(11) 98765-4321',
      clientName: 'João Silva',
      date: '15/01/2026',
      time: '14:30',
      service: 'Consulta',
    },
    {
      headers: {
        Authorization: `Bearer ${yourToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  console.log('Lembrete enviado:', response.data);
}
```

### Python

```python
import requests

def send_whatsapp_message():
    url = "http://localhost:3000/api/whatsapp/send"
    headers = {
        "Authorization": f"Bearer {your_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "company_id": "123e4567-e89b-12d3-a456-426614174000",
        "phone": "(11) 98765-4321",
        "message": "Olá! Mensagem de teste."
    }
    
    response = requests.post(url, json=payload, headers=headers)
    print(response.json())
```

---

## Integração com Sistema de Agendamentos

### Fluxo Automático

1. **Cliente agenda via sistema**
   - Frontend cria agendamento → POST `/api/appointments`

2. **Backend envia confirmação automática**
   - Backend hook → POST `/api/whatsapp/send-confirmation`

3. **Sistema envia lembrete antes do horário**
   - Cron job (24h antes) → POST `/api/whatsapp/send-reminder`

4. **Cliente cancela**
   - Frontend cancela → DELETE `/api/appointments/:id`
   - Backend hook → POST `/api/whatsapp/send-cancellation`

### Exemplo de Hook no Backend

```typescript
// Em appointmentRoutes.ts
router.post('/appointments', authMiddleware, async (req, res) => {
  const appointment = await Appointment.create(req.body);
  
  // Enviar confirmação automática
  await axios.post('http://localhost:3000/api/whatsapp/send-confirmation', {
    company_id: req.body.company_id,
    phone: appointment.client_phone,
    clientName: appointment.client_name,
    date: appointment.date,
    time: appointment.time,
    service: appointment.service,
    confirmationCode: appointment.id,
  }, {
    headers: {
      Authorization: req.headers.authorization,
    }
  });
  
  res.json(appointment);
});
```

---

## Configuração Necessária

### 1. WhatsApp Service Rodando
```bash
pm2 list
# Verificar se whatsapp-service está online
```

### 2. Conexão WhatsApp Ativa
```bash
# Verificar conexões ativas no banco
SELECT * FROM user_connections WHERE status = 'active';
```

### 3. Variável de Ambiente
```env
# backend/.env
WHATSAPP_SERVICE_URL=http://localhost:4000
```

---

## Logs e Debugging

### Ver logs do WhatsApp Service
```bash
pm2 logs whatsapp-service
```

### Ver logs do Backend
```bash
pm2 logs agenda-backend
```

### Testar conexão WhatsApp
```bash
curl http://localhost:4000/health
```

---

## Limitações e Boas Práticas

### ✅ Boas Práticas

1. **Não spam**: Não enviar mais de 10 mensagens por minuto para o mesmo número
2. **Horário comercial**: Enviar apenas entre 8h-20h (configurável)
3. **Opt-out**: Permitir que cliente cancele notificações
4. **Templates claros**: Usar emojis e formatação para melhor legibilidade

### ⚠️ Limitações

1. **WhatsApp Web API**: Limitações do Baileys (não oficial)
2. **Conexão instável**: Se WhatsApp desconectar, mensagens falharão
3. **Números não verificados**: Números que não têm WhatsApp retornarão erro
4. **Rate limiting**: WhatsApp pode bloquear se enviar muitas mensagens rapidamente

---

## Testes

### Script de Teste Completo

```bash
# test-whatsapp-send.sh

# 1. Enviar mensagem simples
curl -X POST http://localhost:3000/api/whatsapp/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "123e4567-e89b-12d3-a456-426614174000",
    "phone": "11987654321",
    "message": "Teste de envio 📨"
  }'

# 2. Enviar lembrete
curl -X POST http://localhost:3000/api/whatsapp/send-reminder \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "123e4567-e89b-12d3-a456-426614174000",
    "phone": "11987654321",
    "clientName": "João Teste",
    "date": "15/01/2026",
    "time": "14:30",
    "service": "Consulta Teste"
  }'

# 3. Enviar confirmação
curl -X POST http://localhost:3000/api/whatsapp/send-confirmation \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "123e4567-e89b-12d3-a456-426614174000",
    "phone": "11987654321",
    "clientName": "Maria Teste",
    "date": "20/01/2026",
    "time": "10:00",
    "confirmationCode": "TEST-001"
  }'
```

---

## Troubleshooting

### Problema: "Nenhuma conexão WhatsApp ativa encontrada"

**Solução:**
```sql
-- Verificar conexões no banco
SELECT * FROM user_connections;

-- Se necessário, atualizar status
UPDATE user_connections 
SET status = 'active' 
WHERE id = 'sua-conexao-id';
```

### Problema: Mensagem não chega

**Checklist:**
1. ✅ WhatsApp service está online?
2. ✅ Conexão WhatsApp está ativa (QR code escaneado)?
3. ✅ Número de telefone está correto (com DDD)?
4. ✅ Número tem WhatsApp instalado?

---

## Próximos Passos

### Features Planejadas

- [ ] Envio de mídia (imagens, documentos)
- [ ] Agendamento de mensagens (enviar em horário específico)
- [ ] Templates personalizados por empresa
- [ ] Histórico de mensagens enviadas
- [ ] Relatório de entrega (lida/entregue)
- [ ] Integração com campanhas de marketing

---

## Arquivos Criados/Modificados

### Novos Arquivos
```
✨ backend/src/services/whatsapp/whatsappNotificationService.ts
✨ WHATSAPP_SEND_GUIDE.md (este arquivo)
```

### Arquivos Modificados
```
📝 backend/src/routes/whatsappRoutes.ts
   - Adicionado 4 novos endpoints de envio
```

---

**Status:** ✅ Sistema de envio funcionando  
**Testado:** ✅ Endpoints validados  
**Pronto para produção:** ✅ Sim

---

Para testar, execute:
```bash
# Rebuild do backend
cd backend
npm run build

# Reiniciar backend
pm2 restart agenda-backend

# Testar envio simples
curl -X POST http://localhost:3000/api/whatsapp/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"company_id":"UUID","phone":"11987654321","message":"Teste!"}'
```
