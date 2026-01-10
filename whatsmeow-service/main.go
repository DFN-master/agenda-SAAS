package main

import (
	"bytes"
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/google/uuid"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/store"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	"google.golang.org/protobuf/proto"

	_ "github.com/mattn/go-sqlite3"
)

// ConnectionInfo armazena informações de uma conexão
type ConnectionInfo struct {
	ID          string
	JID         types.JID
	Connected   bool
	Authenticated bool
	Client      *whatsmeow.Client
	CreatedAt   time.Time
}

// Global state
var (
	connections = make(map[string]*ConnectionInfo)
	mu           sync.RWMutex
	dbPath       = "whatsmeow_auth"
	backendURL   = getEnv("BACKEND_URL", "http://localhost:3000")
)

func getEnv(key, defaultVal string) string {
	if val, exists := os.LookupEnv(key); exists {
		return val
	}
	return defaultVal
}

func main() {
	// Criar diretório de banco de dados
	os.MkdirAll(dbPath, 0700)

	// Rotas HTTP
	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/api/whatsapp/connect", connectHandler)
	http.HandleFunc("/api/whatsapp/send", sendHandler)
	http.HandleFunc("/api/whatsapp/disconnect", disconnectHandler)
	http.HandleFunc("/api/whatsapp/connections", listConnectionsHandler)
	http.HandleFunc("/api/whatsapp/qr", qrHandler)

	// Iniciar servidor HTTP
	port := getEnv("PORT", "4000")
	log.Printf("[WhatsmeowService] Iniciando servidor na porta %s\n", port)
	go func() {
		if err := http.ListenAndServe(":"+port, nil); err != nil {
			log.Fatalf("HTTP server erro: %v", err)
		}
	}()

	// Carregar conexões salvas
	loadSavedConnections()

	// Aguardar sinais de término
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	log.Println("[WhatsmeowService] Encerrando...")
	disconnectAll()
	os.Exit(0)
}

// loadSavedConnections carrega conexões previamente autenticadas
func loadSavedConnections() {
	container, err := sqlstore.New("sqlite3", "file:"+filepath.Join(dbPath, "store.db")+"?cache=shared", nil)
	if err != nil {
		log.Printf("[WhatsmeowService] Erro ao abrir store: %v\n", err)
		return
	}
	defer container.Close()

	devices, err := container.GetAllDevices()
	if err != nil {
		log.Printf("[WhatsmeowService] Erro ao listar dispositivos salvos: %v\n", err)
		return
	}

	for _, device := range devices {
		if device == nil || device.ID == nil {
			continue
		}

		// Criar novo cliente para cada dispositivo
		client := whatsmeow.NewClient(device, nil)
		connID := generateConnectionID()

		// Registrar handlers de evento
		client.AddEventHandler(func(evt interface{}) {
			handleEvent(connID, evt)
		})

		// Conectar
		if err := client.Connect(); err != nil {
			log.Printf("[WhatsmeowService] Erro ao conectar %s: %v\n", connID, err)
			continue
		}

		// Armazenar conexão
		mu.Lock()
		connections[connID] = &ConnectionInfo{
			ID:            connID,
			JID:           device.JID,
			Connected:     true,
			Authenticated: true,
			Client:        client,
			CreatedAt:     time.Now(),
		}
		mu.Unlock()

		log.Printf("[WhatsmeowService] Conexão restaurada: %s (JID: %s)\n", connID, device.JID)
	}
}

// connectHandler inicia novo fluxo de autenticação QR
func connectHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Apenas POST", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		CompanyID string `json:"company_id"`
		UserID    string `json:"user_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Body inválido", http.StatusBadRequest)
		return
	}

	connID := generateConnectionID()

	// Criar novo container de store para esta conexão
	dbFile := filepath.Join(dbPath, "store_"+connID+".db")
	container, err := sqlstore.New("sqlite3", "file:"+dbFile+"?cache=shared", nil)
	if err != nil {
		http.Error(w, fmt.Sprintf("Erro ao criar store: %v", err), http.StatusInternalServerError)
		return
	}

	// Obter ou criar dispositivo
	deviceStore, err := container.GetFirstDevice()
	if err != nil {
		http.Error(w, fmt.Sprintf("Erro ao obter dispositivo: %v", err), http.StatusInternalServerError)
		return
	}

	// Criar cliente
	client := whatsmeow.NewClient(deviceStore, nil)

	// Registrar handlers
	client.AddEventHandler(func(evt interface{}) {
		handleEvent(connID, evt)
	})

	// Armazenar conexão
	mu.Lock()
	connections[connID] = &ConnectionInfo{
		ID:          connID,
		Connected:   false,
		Authenticated: false,
		Client:      client,
		CreatedAt:   time.Now(),
	}
	mu.Unlock()

	// Conectar e gerar QR
	qrChan, _ := client.GetQRChannel(context.Background())
	if err := client.Connect(); err != nil {
		http.Error(w, fmt.Sprintf("Erro ao conectar: %v", err), http.StatusInternalServerError)
		return
	}

	// Aguardar QR
	var qrCode string
	for evt := range qrChan {
		if evt.Event == "code" {
			qrCode = evt.Code
			break
		} else if evt.Event == "success" {
			// QR já foi scaneado
			mu.Lock()
			connections[connID].Authenticated = true
			connections[connID].Connected = true
			mu.Unlock()
			break
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"connection_id": connID,
		"qr_code":       qrCode,
		"status":        "waiting_qr",
		"company_id":    req.CompanyID,
		"user_id":       req.UserID,
	})
}

// qrHandler retorna o QR de uma conexão em andamento
func qrHandler(w http.ResponseWriter, r *http.Request) {
	connID := r.URL.Query().Get("connection_id")
	if connID == "" {
		http.Error(w, "connection_id obrigatório", http.StatusBadRequest)
		return
	}

	mu.RLock()
	conn, exists := connections[connID]
	mu.RUnlock()

	if !exists {
		http.Error(w, "Conexão não encontrada", http.StatusNotFound)
		return
	}

	if conn.Authenticated {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"connection_id": connID,
			"status":        "authenticated",
			"jid":           conn.JID.String(),
		})
		return
	}

	// Retornar QR novamente (simplificado)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"connection_id": connID,
		"status":        "waiting_qr",
	})
}

// sendHandler envia uma mensagem
func sendHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Apenas POST", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ConnectionID string `json:"connection_id"`
		To           string `json:"to"`
		Text         string `json:"text"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Body inválido", http.StatusBadRequest)
		return
	}

	mu.RLock()
	conn, exists := connections[req.ConnectionID]
	mu.RUnlock()

	if !exists {
		http.Error(w, "Conexão não encontrada", http.StatusNotFound)
		return
	}

	if !conn.Authenticated {
		http.Error(w, "Conexão não autenticada", http.StatusForbidden)
		return
	}

	// Normalizar número para JID
	jid, err := types.ParseJID(req.To)
	if err != nil {
		// Tentar adicionar @s.whatsapp.net se não tiver @
		if !strings.Contains(req.To, "@") {
			req.To = req.To + "@s.whatsapp.net"
			jid, err = types.ParseJID(req.To)
		}
		if err != nil {
			http.Error(w, fmt.Sprintf("JID inválido: %v", err), http.StatusBadRequest)
			return
		}
	}

	// Criar mensagem
	msg := &waE2E.Message{
		Conversation: proto.String(req.Text),
	}

	// Enviar
	resp, err := conn.Client.SendMessage(context.Background(), jid, msg)
	if err != nil {
		http.Error(w, fmt.Sprintf("Erro ao enviar: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "sent",
		"message_id": resp.ID,
		"timestamp": resp.Timestamp,
	})
}

// disconnectHandler desconecta uma conexão
func disconnectHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Apenas POST", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ConnectionID string `json:"connection_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Body inválido", http.StatusBadRequest)
		return
	}

	mu.Lock()
	conn, exists := connections[req.ConnectionID]
	if exists {
		conn.Client.Disconnect()
		delete(connections, req.ConnectionID)
	}
	mu.Unlock()

	if !exists {
		http.Error(w, "Conexão não encontrada", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "disconnected",
	})
}

// listConnectionsHandler lista todas as conexões
func listConnectionsHandler(w http.ResponseWriter, r *http.Request) {
	mu.RLock()
	defer mu.RUnlock()

	var list []map[string]interface{}
	for _, conn := range connections {
		list = append(list, map[string]interface{}{
			"connection_id":  conn.ID,
			"jid":            conn.JID.String(),
			"authenticated":  conn.Authenticated,
			"connected":      conn.Connected,
			"created_at":     conn.CreatedAt,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"connections": list,
		"count":       len(list),
	})
}

// healthHandler retorna status
func healthHandler(w http.ResponseWriter, r *http.Request) {
	mu.RLock()
	count := len(connections)
	mu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":       "ok",
		"service":      "whatsmeow-service",
		"connections":  count,
		"timestamp":    time.Now(),
	})
}

// handleEvent processa eventos de mensagens recebidas
func handleEvent(connID string, evt interface{}) {
	switch v := evt.(type) {
	case *events.Message:
		// Processar mensagem recebida
		msg := v.Message
		if msg.Conversation != nil {
			go notifyBackend(connID, v.Info.Sender.String(), *msg.Conversation)
		}
	case *events.Connected:
		log.Printf("[%s] ✓ Conectado ao WhatsApp\n", connID)
		mu.Lock()
		if conn, exists := connections[connID]; exists {
			conn.Connected = true
		}
		mu.Unlock()
	case *events.LoggedInUnexpectedly:
		log.Printf("[%s] ✓ Logado inesperadamente\n", connID)
		mu.Lock()
		if conn, exists := connections[connID]; exists {
			conn.Authenticated = true
		}
		mu.Unlock()
	case *events.Disconnected:
		log.Printf("[%s] ✗ Desconectado\n", connID)
		mu.Lock()
		if conn, exists := connections[connID]; exists {
			conn.Connected = false
		}
		mu.Unlock()
	}
}

// notifyBackend envia mensagem recebida para o backend
func notifyBackend(connID, from, text string) {
	payload := map[string]interface{}{
		"connection_id": connID,
		"from":          from,
		"text":          text,
		"timestamp":     time.Now(),
	}

	body, _ := json.Marshal(payload)
	resp, err := http.Post(
		backendURL+"/api/whatsapp/webhook",
		"application/json",
		bytes.NewReader(body),
	)

	if err != nil {
		log.Printf("[%s] Erro ao notificar backend: %v\n", connID, err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		log.Printf("[%s] Backend retornou %d\n", connID, resp.StatusCode)
	}
}

// generateConnectionID cria um ID único para conexão
func generateConnectionID() string {
	hash := md5.Sum([]byte(uuid.New().String() + fmt.Sprintf("%d", time.Now().UnixNano())))
	return "conn_" + hex.EncodeToString(hash[:])
}

// disconnectAll desconecta todas as conexões
func disconnectAll() {
	mu.Lock()
	defer mu.Unlock()

	for _, conn := range connections {
		conn.Client.Disconnect()
	}
	connections = make(map[string]*ConnectionInfo)
}
