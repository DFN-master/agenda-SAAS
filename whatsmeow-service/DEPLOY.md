# Whatsmeow Service - Instruções de Deploy

## 📦 Estrutura

- **whatsmeow-service/** - Serviço em Go (porta 4000)
- **whatsapp-service/** - Wrapper em Node.js Express (porta 4001)

## 🚀 Início Rápido - Desenvolvimento Local

### Instalar e Rodar Whatsmeow (Go)

```bash
cd whatsmeow-service

# Baixar dependências Go
go mod download

# Rodar diretamente
go run main.go

# Ou compilar e rodar
go build -o whatsmeow
./whatsmeow
```

### Instalar e Rodar WhatsApp Service (Node.js)

```bash
cd whatsapp-service

# Instalar dependências
npm install

# Compilar TypeScript
npm run build

# Rodar
npm start
```

## 🐳 Deploy com Docker

### Build da imagem Whatsmeow

```bash
docker build -f docker/whatsmeow.Dockerfile -t whatsmeow-service:latest .
```

### Run do container

```bash
docker run -d \
  --name whatsmeow \
  -p 4000:4000 \
  -e BACKEND_URL=http://backend:3000 \
  -v whatsmeow_auth:/app/whatsmeow_auth \
  whatsmeow-service:latest
```

### Docker Compose

Atualize seu `docker-compose.yml` para incluir:

```yaml
  whatsmeow:
    build:
      context: .
      dockerfile: docker/whatsmeow.Dockerfile
    ports:
      - "4000:4000"
    environment:
      - BACKEND_URL=http://backend:3000
      - PORT=4000
    volumes:
      - whatsmeow_auth:/app/whatsmeow_auth
    depends_on:
      - backend
```

## 🔗 Endpoints

### Whatsmeow (Go) - `http://localhost:4000`

- `GET /health` - Status do serviço
- `POST /api/whatsapp/connect` - Iniciar autenticação com QR
- `GET /api/whatsapp/qr?connection_id=...` - Verificar QR/Status
- `POST /api/whatsapp/send` - Enviar mensagem
- `POST /api/whatsapp/disconnect` - Desconectar
- `GET /api/whatsapp/connections` - Listar conexões

### WhatsApp Service (Node) - `http://localhost:4001/whatsapp`

Wrapper que chama o Whatsmeow:

- `POST /connect` - Iniciar autenticação
- `POST /connections` - Criar conexão (legacy)
- `GET /qr?connection_id=...` - Obter QR
- `POST /send` - Enviar mensagem
- `DELETE /connections/:id` - Desconectar
- `GET /connections` - Listar

## 📝 Fluxo de Autenticação

1. **Frontend** chama `POST /whatsapp/connect` (Node)
2. **Node** chama `POST /api/whatsapp/connect` (Go)
3. **Go** gera QR code e retorna
4. **Frontend** exibe QR e faz polling em `GET /whatsapp/qr?connection_id=...`
5. Usuário escaneia QR com telefone
6. **Go** detecta autenticação e muda status para `authenticated`
7. **Frontend** detecta mudança e pronto para usar!

## 🔄 Integração com Backend

Quando o Whatsmeow recebe uma mensagem, envia para:

```
POST {BACKEND_URL}/api/whatsapp/webhook
```

Com payload:

```json
{
  "connection_id": "conn_xxx",
  "from": "5511999999999@s.whatsapp.net",
  "text": "Olá!",
  "timestamp": 1234567890
}
```

## 🛠 Desenvolvimento

### Whatsmeow (Go)

- Modificar `whatsmeow-service/main.go`
- Rebuild: `go build -o whatsmeow`
- Test: `go test ./...` (em breve)

### WhatsApp Service (Node)

- Modificar `whatsapp-service/src/routes/whatsappRoutes.ts`
- Rebuild: `npm run build`
- Dev: `npm run dev`

## ⚠️ Troubleshooting

### Whatsmeow não conecta

```bash
# Verificar se o serviço está rodando
curl http://localhost:4000/health

# Verificar logs
docker logs whatsmeow
```

### QR code não aparece

- Aguarde 2-3 segundos após conectar (geração do QR)
- Verifique se o Whatsmeow tem acesso ao banco SQLite (`whatsmeow_auth/`)

### Mensagens não enviam

- Verifique se a conexão está autenticada (`/api/whatsapp/qr`)
- Valide o JID do destinatário (ex: `5511999999999@s.whatsapp.net`)
- Confira logs do Whatsmeow

## 📚 Referências

- Whatsmeow: https://github.com/tulir/whatsmeow
- WhatsApp API: https://pkg.go.dev/go.mau.fi/whatsmeow

## ✅ Status

- ✅ Multiconexão (Go)
- ✅ Persistência SQLite (Go)
- ✅ Webhook para Backend
- ✅ Wrapper Node.js
- ⏳ Web UI para QR (frontend)
- ⏳ Tratamento de desconexões automáticas
