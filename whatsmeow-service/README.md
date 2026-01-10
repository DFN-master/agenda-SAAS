# WhatsApp Service (Whatsmeow em Go)

Microserviço WhatsApp que utiliza **Whatsmeow** (biblioteca Go oficial) para gerenciar autenticação e envio/recebimento de mensagens via WhatsApp.

## Porta
- **4000** (padrão)

## Dependências
- Go 1.21+
- Whatsmeow (go.mau.fi/whatsmeow)
- SQLite3 para persistência de autenticação

## Instalação

```bash
cd whatsmeow-service
go mod download
go run main.go
```

## Endpoints

### Health Check
```
GET /health
```

### Iniciar Autenticação
```
POST /api/whatsapp/connect
{
  "company_id": "uuid",
  "user_id": "uuid"
}

Response:
{
  "connection_id": "conn_xxx",
  "qr_code": "00020...",
  "status": "waiting_qr"
}
```

### Verificar QR / Status
```
GET /api/whatsapp/qr?connection_id=conn_xxx
```

### Enviar Mensagem
```
POST /api/whatsapp/send
{
  "connection_id": "conn_xxx",
  "to": "5511999999999",
  "text": "Olá!"
}

Response:
{
  "status": "sent",
  "message_id": "xxx",
  "timestamp": 1234567890
}
```

### Desconectar
```
POST /api/whatsapp/disconnect
{
  "connection_id": "conn_xxx"
}
```

### Listar Conexões
```
GET /api/whatsapp/connections
```

## Webhook (Backend)
O serviço envia mensagens recebidas para:
```
POST {BACKEND_URL}/api/whatsapp/webhook
```

## Variáveis de Ambiente
- `PORT` - Porta do serviço (padrão: 4000)
- `BACKEND_URL` - URL do backend (padrão: http://localhost:3000)

## Status
- ✅ Multiconexão (várias contas WhatsApp)
- ✅ Persistência de autenticação (SQLite)
- ✅ Recepção de mensagens em tempo real
- ✅ Envio de mensagens com confirmação
- ✅ Webhook para backend
