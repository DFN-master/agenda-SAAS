#!/usr/bin/env node

/**
 * Whatsmeow Service com whatsapp-web.js
 * Integração real com WhatsApp Web via Puppeteer
 */

import express from 'express';
import cors from 'cors';
import wajs from 'whatsapp-web.js';
import qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';

const { Client, LocalAuth, Events } = wajs;

const app = express();
const PORT = process.env.PORT || 4000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// Middleware
app.use(express.json());
app.use(cors({ origin: '*', credentials: true }));

// In-memory store de clientes e QR codes
const clients = new Map();
const qrCodes = new Map();
const connections = new Map();

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
app.post('/api/whatsapp/connect', async (req, res) => {
  const { company_id, user_id } = req.body;

  if (!company_id || !user_id) {
    return res.status(400).json({ message: 'company_id e user_id obrigatórios' });
  }

  const connection_id = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    console.log(`[WHATSAPP] Iniciando autenticação para ${connection_id}`);

    // Criar cliente WhatsApp
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: connection_id }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process'
        ],
      },
    });

    // Evento QR Code
    client.on(Events.QR_RECEIVED, async (qr) => {
      console.log(`[WHATSAPP] QR Code recebido para ${connection_id}`);
      
      // Gerar imagem PNG do QR code
      try {
        const qr_base64 = await qrcode.toDataURL(qr, {
          errorCorrectionLevel: 'H',
          type: 'image/png',
          width: 300,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
        qrCodes.set(connection_id, qr_base64);
        
        console.log(`[WHATSAPP] QR Code armazenado (${qr_base64.length} bytes)`);
      } catch (err) {
        console.error(`[WHATSAPP] Erro ao gerar QR code: ${err.message}`);
      }
    });

    // Evento autenticado
    client.on(Events.AUTHENTICATED, async () => {
      console.log(`[WHATSAPP] ✅ Autenticado: ${connection_id}`);
      
      const info = client.info;
      connections.set(connection_id, {
        connection_id,
        jid: info.wid.user,
        number: info.wid.user,
        name: info.pushname || info.wid.user,
        status: 'authenticated',
        company_id,
        user_id,
        created_at: new Date(),
        client,
      });

      // Limpar QR code
      qrCodes.delete(connection_id);

      // Salvar conexão no backend
      try {
        await fetch(`${BACKEND_URL}/api/connections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'whatsapp',
            name: `WhatsApp - ${info.pushname || info.wid.user}`,
            config: {
              connection_id,
              status: 'authenticated',
              phoneNumber: info.wid.user,
            },
            whatsapp_number: info.wid.user,
            whatsapp_name: info.pushname || info.wid.user,
            whatsapp_status: 'authenticated',
            user_id,
            company_id,
          }),
        });
      } catch (err) {
        console.error(`[WHATSAPP] Erro ao salvar conexão: ${err.message}`);
      }
    });

    // Evento desconectado
    client.on(Events.DISCONNECTED, async () => {
      console.log(`[WHATSAPP] Desconectado: ${connection_id}`);
      clients.delete(connection_id);
      connections.delete(connection_id);
      qrCodes.delete(connection_id);
      
      try {
        await client.destroy();
      } catch (err) {
        console.error(`[WHATSAPP] Erro ao destruir cliente: ${err.message}`);
      }
    });

    // Iniciar cliente
    await client.initialize();
    clients.set(connection_id, client);

    // Esperar até 5 segundos pelo QR code
    let qr_code = null;
    for (let i = 0; i < 50; i++) {
      if (qrCodes.has(connection_id)) {
        qr_code = qrCodes.get(connection_id);
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!qr_code) {
      console.error(`[WHATSAPP] Timeout esperando QR code para ${connection_id}`);
      // Retornar um QR code padrão temporário
      qr_code = await qrcode.toDataURL('waiting', { 
        type: 'image/png',
        width: 300,
        margin: 1,
      });
    }

    res.json({
      connection_id,
      qr_code,
      status: 'waiting_qr',
      company_id,
      user_id,
    });

  } catch (err) {
    console.error(`[WHATSAPP] Erro ao conectar: ${err.message}`);
    res.status(500).json({ message: `Erro ao conectar: ${err.message}` });
  }
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
      number: conn.number,
      name: conn.name,
    });
  }

  // Se tem QR code pendente
  if (qrCodes.has(connection_id)) {
    return res.json({
      connection_id,
      status: 'waiting_qr',
      qr_code: qrCodes.get(connection_id),
    });
  }

  // Se cliente existe mas sem QR code ainda
  if (clients.has(connection_id)) {
    return res.json({
      connection_id,
      status: 'loading',
      message: 'Gerando QR code...',
    });
  }

  res.status(404).json({ message: 'Conexão não encontrada' });
});

/**
 * POST /api/whatsapp/send
 * Enviar mensagem
 */
app.post('/api/whatsapp/send', async (req, res) => {
  const { connection_id, to, text } = req.body;

  if (!connection_id || !to || !text) {
    return res.status(400).json({ message: 'Campos obrigatórios faltando' });
  }

  if (!connections.has(connection_id)) {
    return res.status(404).json({ message: 'Conexão não encontrada' });
  }

  try {
    const conn = connections.get(connection_id);
    const result = await conn.client.sendMessage(to + '@c.us', text);

    res.json({
      status: 'sent',
      message_id: result.id.id,
      timestamp: result.timestamp,
      connection_id,
      to,
    });
  } catch (err) {
    console.error(`[WHATSAPP] Erro ao enviar: ${err.message}`);
    res.status(500).json({ message: `Erro ao enviar: ${err.message}` });
  }
});

/**
 * POST /api/whatsapp/disconnect
 * Desconectar
 */
app.post('/api/whatsapp/disconnect', async (req, res) => {
  const { connection_id } = req.body;

  if (!connection_id) {
    return res.status(400).json({ message: 'connection_id obrigatório' });
  }

  if (!clients.has(connection_id)) {
    return res.status(404).json({ message: 'Conexão não encontrada' });
  }

  try {
    const client = clients.get(connection_id);
    await client.logout();
    res.json({ message: 'Desconectado com sucesso' });
  } catch (err) {
    console.error(`[WHATSAPP] Erro ao desconectar: ${err.message}`);
    res.status(500).json({ message: `Erro ao desconectar: ${err.message}` });
  }
});

/**
 * GET /api/whatsapp/connections
 * Listar conexões ativas
 */
app.get('/api/whatsapp/connections', (req, res) => {
  const list = Array.from(connections.values()).map(conn => ({
    connection_id: conn.connection_id,
    jid: conn.jid,
    number: conn.number,
    name: conn.name,
    status: conn.status,
    created_at: conn.created_at,
  }));

  res.json({ connections: list, count: list.length });
});

/**
 * Iniciar servidor
 */
const server = app.listen(PORT, () => {
  console.log(`[WHATSMEOW] 🚀 Serviço rodando na porta ${PORT}`);
  console.log(`[WHATSMEOW] Usando whatsapp-web.js com Puppeteer`);
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
  console.log('[WHATSMEOW] SIGTERM recebido, desligando...');
  for (const client of clients.values()) {
    try {
      await client.destroy();
    } catch (err) {
      console.error(`[WHATSMEOW] Erro ao destruir cliente: ${err.message}`);
    }
  }
  server.close();
});

process.on('SIGINT', async () => {
  console.log('[WHATSMEOW] SIGINT recebido, desligando...');
  for (const client of clients.values()) {
    try {
      await client.destroy();
    } catch (err) {
      console.error(`[WHATSMEOW] Erro ao destruir cliente: ${err.message}`);
    }
  }
  server.close(() => process.exit(0));
});
