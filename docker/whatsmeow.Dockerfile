# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache git sqlite-dev gcc musl-dev

# Copiar go.mod e go.sum
COPY whatsmeow-service/go.mod whatsmeow-service/go.sum ./

# Download dependências
RUN go mod download

# Copiar código
COPY whatsmeow-service/main.go ./

# Build
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o whatsmeow .

# Runtime stage
FROM alpine:latest

WORKDIR /app

# Instalar SQLite runtime
RUN apk add --no-cache sqlite-libs ca-certificates

# Copiar binário do builder
COPY --from=builder /app/whatsmeow .

# Criar diretório de dados
RUN mkdir -p /app/whatsmeow_auth

# Expor porta
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Variáveis de ambiente padrão
ENV PORT=4000
ENV BACKEND_URL=http://localhost:3000

# Executar
CMD ["./whatsmeow"]
