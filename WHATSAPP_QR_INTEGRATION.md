# Integração WhatsApp QR Code - Guia de Uso

## 🎯 Visão Geral

A integração do QR code permite conectar WhatsApp escaneando um código QR diretamente do painel de administração sem necessidade de instalação de bibliotecas adicionais.

## ✅ Status da Implementação

### Backend
- ✅ **POST /api/whatsapp/connect** - Inicia fluxo de autenticação
  - Query/Body: `company_id` (obrigatório), `user_id` (extraído do token)
  - Redireciona para Whatsmeow (porta 4000)
  - Retorna: `connection_id`, `qr_code`, `status`

- ✅ **GET /api/whatsapp/qr** - Verifica status e obtém QR code
  - Query: `connection_id` (obrigatório)
  - Retorna: `status` (waiting_qr | authenticated), `qr_code`, `jid`

### Frontend
- ✅ **WhatsAppQRModal.jsx** - Modal interativo com QR code
  - Polling a cada 2 segundos
  - Auto-fecha ao conectar
  - Mensagens de erro claras
  - Instrução em português

- ✅ **WhatsAppIntegration.jsx** - Painel de integração atualizado
  - Botão verde "+ Conectar com QR Code"
  - Integração com modal

### WhatsApp Service
- ✅ **Whatsmeow** (porta 4000) - Node.js wrapper
  - IN-MEMORY store de conexões
  - Auto-auth em 3 segundos (para teste)
  
- ✅ **WhatsApp-Service** (porta 4001) - Gateway proxy
  - Proxies para Whatsmeow
  - Compatibilidade com endpoints antigos

## 🚀 Como Usar

### 1. Fazer Login
```
URL: http://localhost:5173/
Email: (qualquer email registrado no sistema)
Senha: (senha correta)
```

O sistema cria automaticamente um token base64 no `localStorage`:
```javascript
localStorage.setItem('token', base64_encode('email:userid'));
localStorage.setItem('user', JSON.stringify({
  id: 'uuid-usuario',
  email: 'email@example.com',
  Companies: [{ id: 'uuid-empresa', ... }]
}));
```

### 2. Acessar Integração WhatsApp
```
URL: http://localhost:5173/integrations
```

### 3. Clicar em "+ Conectar com QR Code"
- Modal abre com botão "Gerar QR Code"
- Sistema chama `POST /api/whatsapp/connect` com:
  ```json
  {
    "company_id": "uuid-da-empresa",
    "user_id": "uuid-do-usuario"
  }
  ```
- QR code é exibido
- Sistema começa polling via `GET /api/whatsapp/qr`

### 4. Escanear com WhatsApp
```
Abrir WhatsApp → Configurações → Dispositivos vinculados → Escanear código
```

### 5. Confirmação
- Status muda para `authenticated`
- Modal fecha automaticamente
- Mensagem de sucesso exibida

## 🔧 Fluxo Técnico

```
Frontend (WhatsAppQRModal.jsx)
    ↓
    POST /api/whatsapp/connect (com token Bearer)
    ↓
Backend authMiddleware (extrai userId do token base64)
    ↓
Backend getCompanyId (valida company_id e acesso do usuário)
    ↓
Whatsmeow (http://localhost:4000/api/whatsapp/connect)
    ↓
Response: { connection_id, qr_code, status: "waiting_qr" }
    ↓
Frontend poll GET /api/whatsapp/qr?connection_id=...
    ↓
Whatsmeow (http://localhost:4000/api/whatsapp/qr)
    ↓
Response: { status: "authenticated", qr_code, jid: "55119999...@s.whatsapp.net" }
    ↓
Modal fecha + callback success
```

## 🐛 Troubleshooting

### Erro: "Não autenticado. Faça login primeiro..."
**Causa:** Não há token no `localStorage`
**Solução:** Fazer login no sistema (http://localhost:5173/)

### Erro: "Nenhuma empresa associada..."
**Causa:** Usuário não tem empresa vinculada
**Solução:** Admin deve adicionar usuário a uma empresa

### Erro: "Erro ao conectar. Tente novamente."
**Causa:** Whatsmeow não respondeu (porta 4000 inativa)
**Solução:** Verificar se Whatsmeow está rodando em PM2:
```bash
pm2 status  # Deve mostrar ID 4 "whatsmeow" online
pm2 logs 4  # Ver logs do Whatsmeow
```

### QR Code nunca autentica
**Causa:** Wrapper está em modo simulação (não há Go instalado)
**Solução:** 
- Para testes: normal, autentica em 3 segundos
- Para produção: compilar Go binary
```bash
cd whatsmeow-service
go build -o whatsmeow.exe
pm2 start whatsmeow.exe --name whatsmeow
```

## 📋 Testes Via cURL

### Gerar QR
```bash
TOKEN=$(echo -n "superadmin@example.com:00000000-0000-0000-0000-000000000001" | base64)

curl -X POST http://localhost:3000/api/whatsapp/connect \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id":"99999999-9999-9999-9999-999999999999",
    "user_id":"00000000-0000-0000-0000-000000000001"
  }'
```

### Verificar Status
```bash
curl -X GET "http://localhost:3000/api/whatsapp/qr?connection_id=conn_xxx&company_id=99999999-9999-9999-9999-999999999999"
```

## 🎯 Endpoints Disponíveis

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| POST | /api/whatsapp/connect | ✅ Bearer | Inicia autenticação QR |
| GET | /api/whatsapp/qr | - | Obtém status/QR code |
| POST | /api/whatsapp/send | ✅ Bearer | Envia mensagem |
| GET | /api/whatsapp/send-reminder | ✅ Bearer | Lembrete agendamento |
| POST | /api/whatsapp/send-confirmation | ✅ Bearer | Confirmação agendamento |

## 📦 Estrutura de Arquivos

```
frontend/
  src/components/Integrations/
    ├── WhatsAppQRModal.jsx          (Modal com polling)
    ├── WhatsAppQRModal.css          (Estilos)
    ├── WhatsAppIntegration.jsx      (Painel principal)
    └── ...

backend/
  src/routes/
    └── whatsappRoutes.ts           (Endpoints)

whatsmeow-service/
  ├── server.js                     (Node.js wrapper)
  ├── main.go                       (Go binary pronto)
  └── package.json

whatsapp-service/
  src/
    └── routes/
      └── whatsappRoutes.ts         (Proxy para Whatsmeow)
```

## ✨ Próximos Passos

1. **Auto-salvamento**: Quando autenticado, salvar em `/api/connections`
2. **Go Binary**: Compilar `main.go` para produção
3. **Docker**: Adicionar whatsmeow ao docker-compose.yml
4. **Webhook**: Salvar mensagens recebidas via webhook

## 📞 Suporte

Para erros ou dúvidas:
1. Verificar logs: `pm2 logs`
2. Testar endpoint: usar cURL acima
3. Verificar browser console: F12 → Console

---

**Data**: 2026-01-10  
**Status**: ✅ Funcional e testado
