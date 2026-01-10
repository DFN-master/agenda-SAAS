#!/usr/bin/env node

/**
 * Whatsmeow Service Wrapper para Windows/PM2
 * Simula o serviço Go em Node.js até que Go esteja instalado
 * Em produção, substituir pelo binário compilado: whatsmeow-service/whatsmeow.exe
 */

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// Middleware
app.use(express.json());
app.use(cors({ origin: '*', credentials: true }));

// In-memory store de conexões
const connections = new Map();
const pendingQRCodes = new Map();

/**
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'whatsmeow-service',
    connections: connections.size,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/whatsapp/connect
 * Inicia novo fluxo de autenticação
 */
app.post('/api/whatsapp/connect', (req, res) => {
  const { company_id, user_id } = req.body;

  if (!company_id || !user_id) {
    return res.status(400).json({ message: 'company_id e user_id obrigatórios' });
  }

  const connection_id = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const qr_code = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAyQAAAMkCAIAAACdjj+jAAABG0lEQVR4nO3BMQEAAADCoPVPbQhfoAAAAAAAAAAAAAB4NxIHAAGXRO0=`;

  // Simular QR code pendente
  pendingQRCodes.set(connection_id, {
    qr_code,
    company_id,
    user_id,
    created_at: Date.now(),
  });

  // Simular autenticação após 3 segundos (para teste)
  setTimeout(() => {
    if (pendingQRCodes.has(connection_id)) {
      const data = pendingQRCodes.get(connection_id);
      connections.set(connection_id, {
        connection_id,
        jid: `5511999999999@s.whatsapp.net`,
        status: 'authenticated',
        company_id: data.company_id,
        user_id: data.user_id,
        created_at: data.created_at,
      });
      pendingQRCodes.delete(connection_id);
      console.log(`[WHATSMEOW] ✅ Conexão autenticada: ${connection_id}`);
    }
  }, 3000);

  res.json({
    connection_id,
    qr_code,
    status: 'waiting_qr',
    company_id,
    user_id,
  });
});

/**
 * GET /api/whatsapp/qr
 * Verificar status da autenticação
 */
app.get('/api/whatsapp/qr', (req, res) => {
  const { connection_id } = req.query;

  if (!connection_id) {
    return res.status(400).json({ message: 'connection_id obrigatório' });
  }

  // Se já autenticado
  if (connections.has(connection_id)) {
    const conn = connections.get(connection_id);
    return res.json({
      connection_id,
      status: 'authenticated',
      jid: conn.jid,
    });
  }

  // Se pendente
  if (pendingQRCodes.has(connection_id)) {
    const data = pendingQRCodes.get(connection_id);
    return res.json({
      connection_id,
      status: 'waiting_qr',
      qr_code: data.qr_code,
    });
  }

  res.status(404).json({ message: 'Conexão não encontrada' });
});

/**
 * POST /api/whatsapp/send
 * Enviar mensagem
 */
app.post('/api/whatsapp/send', (req, res) => {
  const { connection_id, to, text } = req.body;

  if (!connection_id || !to || !text) {
    return res.status(400).json({ message: 'Campos obrigatórios faltando' });
  }

  if (!connections.has(connection_id)) {
    return res.status(404).json({ message: 'Conexão não encontrada' });
  }

  const conn = connections.get(connection_id);
  if (conn.status !== 'authenticated') {
    return res.status(403).json({ message: 'Conexão não autenticada' });
  }

  console.log(`[WHATSMEOW] 📤 Mensagem enviada: ${to} - "${text.substring(0, 50)}..."`);

  res.json({
    status: 'sent',
    message_id: uuidv4(),
    timestamp: Date.now(),
    connection_id,
    to,
  });
});

/**
 * POST /api/whatsapp/disconnect
 * Desconectar
 */
app.post('/api/whatsapp/disconnect', (req, res) => {
  const { connection_id } = req.body;

  if (!connection_id || !connections.has(connection_id)) {
    return res.status(404).json({ message: 'Conexão não encontrada' });
  }

  connections.delete(connection_id);
  pendingQRCodes.delete(connection_id);

  console.log(`[WHATSMEOW] 🔌 Desconectado: ${connection_id}`);

  res.json({ status: 'disconnected' });
});

/**
 * GET /api/whatsapp/connections
 * Listar conexões
 */
app.get('/api/whatsapp/connections', (req, res) => {
  const list = Array.from(connections.values()).map((conn) => ({
    connection_id: conn.connection_id,
    jid: conn.jid,
    authenticated: conn.status === 'authenticated',
    connected: true,
    created_at: conn.created_at,
  }));

  res.json({
    connections: list,
    count: list.length,
  });
});

/**
 * POST /api/whatsapp/webhook (Backend → Whatsmeow)
 * Simulação de webhook de mensagem recebida
 */
app.post('/api/whatsapp/webhook', (req, res) => {
  const { connection_id, from, text } = req.body;
  console.log(`[WHATSMEOW] 📥 Mensagem recebida via ${connection_id} de ${from}: "${text.substring(0, 50)}..."`);
  res.json({ received: true });
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  🐹 WHATSMEOW SERVICE (Modo Wrapper/Simulação)            ║
╠════════════════════════════════════════════════════════════╣
║  Porta: ${PORT}                                              ║
║  Status: ✅ Online                                          ║
║  Modo: Wrapper Node.js (até Go estar instalado)           ║
╚════════════════════════════════════════════════════════════╝

📍 Endpoints disponíveis:
  GET    /health
  POST   /api/whatsapp/connect
  GET    /api/whatsapp/qr?connection_id=...
  POST   /api/whatsapp/send
  POST   /api/whatsapp/disconnect
  GET    /api/whatsapp/connections

⚠️  NOTA: Este é um wrapper para desenvolvimento.
   Em produção, instale Go e compile: whatsmeow-service/main.go

🔗 Teste:
  curl http://localhost:${PORT}/health
  `);
});
