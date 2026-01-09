# Microservice WhatsApp - Documentação

## Visão Geral

O microservice WhatsApp foi criado como um serviço independente que gerencia a autenticação e conexão com WhatsApp usando a biblioteca Baileys. Ele roda na porta **4000** e se comunica com o backend principal e o frontend.

## Arquitetura

### Estrutura de Pastas

```
whatsapp-service/
├── src/
│   ├── index.ts           # Servidor Express principal
│   ├── types.ts           # Tipos e interfaces
│   └── routes/
│       └── whatsappRoutes.ts  # Rotas da API
├── dist/                  # Código compilado
├── package.json
├── tsconfig.json
└── .env
```

## Endpoints da API

### POST `/whatsapp/connections`
Cria uma nova conexão WhatsApp e inicia o processo de geração de QR code.

**Request:**
```json
{
  "userId": "uuid-do-usuario",
  "phoneNumber": "+55 (11) 99999-9999" // opcional
}
```

**Response (201):**
```json
{
  "connectionId": "conn_1234567890",
  "status": "scanning",
  "message": "Escaneie o QR code com seu WhatsApp"
}
```

### GET `/whatsapp/connections/:connectionId/qr`
Obtém o QR code para autenticação (polling).

**Response (200 - QR pronto):**
```json
{
  "status": "scanning",
  "qrCode": "data:image/png;base64,..." // QR code em base64
}
```

**Response (202 - Ainda gerando):**
```json
{
  "status": "scanning",
  "message": "QR code não está pronto, tente novamente em alguns segundos"
}
```

**Response (200 - Conectado):**
```json
{
  "status": "connected",
  "qrCode": "data:image/png;base64,..."
}
```

### GET `/whatsapp/connections/:connectionId/status`
Obtém o status atual da conexão.

**Response:**
```json
{
  "connectionId": "conn_1234567890",
  "status": "connected",
  "phoneNumber": "+5511999999999"
}
```

### DELETE `/whatsapp/connections/:connectionId`
Desconecta e remove a conexão WhatsApp.

**Response (200):**
```json
{
  "message": "Conexão removida com sucesso"
}
```

## Fluxo de Autenticação

1. **Frontend requisita conexão**
   - POST para `/whatsapp/connections` no microservice
   - Recebe `connectionId`

2. **Frontend faz polling do QR code**
   - GET para `/whatsapp/connections/{connectionId}/qr` a cada 2 segundos
   - Exibe o QR code assim que disponível

3. **Usuário escaneia QR code**
   - Abre WhatsApp → Configurações → Dispositivos vinculados
   - Escaneia o código QR exibido

4. **WhatsApp autentica**
   - Microservice recebe autenticação do Baileys
   - Status muda para `connected`

5. **Frontend salva no backend**
   - POST para `/api/connections` com os dados da conexão
   - Associa a conexão ao usuário

## Integração com Backend Principal

### Fluxo de Salvamento

```
Frontend
  ↓ (POST /whatsapp/connections)
Microservice WhatsApp
  ↓ (gera QR code)
Frontend (polling /whatsapp/connections/{id}/qr)
  ↓ (quando conectado, POST /api/connections)
Backend Principal
  ↓ (salva connection no banco de dados)
Database
```

## Dados Armazenados no Backend

Quando a conexão é salva no backend, o seguinte payload é enviado:

```json
{
  "type": "whatsapp",
  "name": "Meu WhatsApp Business",
  "config": {
    "connectionId": "conn_1234567890",
    "status": "connected",
    "phone_number": "+5511999999999",
    "name": "Meu WhatsApp Business"
  }
}
```

## Próximos Passos

1. **Implementar Baileys Real**
   - Substituir armazenamento em memória por banco de dados
   - Implementar persistência de sessão

2. **Envio de Mensagens**
   - Implementar endpoint para enviar mensagens
   - Integrar com sistema de filas (Bull/RabbitMQ)

3. **Recebimento de Mensagens**
   - Webhook para receber mensagens
   - Salvar no banco de dados
   - Notificar frontend via WebSocket

4. **Gerenciamento de Múltiplas Conexões**
   - Suportar múltiplas contas WhatsApp por usuário
   - Load balancing

5. **Monitoring e Logs**
   - Adicionar logging estruturado
   - Métricas de performance
   - Alertas

## Variáveis de Ambiente

`.env` (whatsapp-service):
```
NODE_ENV=development
PORT=4000
```

## Comando de Start

```bash
# Via PM2 (recomendado)
pm2 start ecosystem.config.js

# Desenvolvimento
npm run dev

# Build e run
npm run build && npm start
```

## Troubleshooting

### Serviço não inicia
1. Verificar se porta 4000 está disponível
2. Verificar logs: `pm2 logs whatsapp-service`
3. Verificar dependências: `npm install`

### QR code não aparece
1. Verificar logs do serviço
2. Tentar novamente (limite de timeout: ~30 segundos)
3. Cancelar e criar nova conexão

### Desconexão espontânea
- Implementar reconexão automática (em desenvolvimento)
- Verificar logs de erro

