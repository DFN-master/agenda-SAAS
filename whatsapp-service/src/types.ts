import makeWASocket, { DisconnectReason, jidDecode, useMultiFileAuthState, WAMessage } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode';
import { promises as fs } from 'fs';
import path from 'path';
import fetch from 'node-fetch';

export interface WhatsAppConnection {
  id: string;
  userId: string;
  phoneNumber: string;
  qrCode?: string;
  status: 'disconnected' | 'scanning' | 'connecting' | 'connected';
  socket?: any;
  createdAt: Date;
  // Dados do usuário autenticado
  userName?: string;
  userStatus?: string;
  userProfilePic?: string;
  userPhone?: string; // Número no formato legível (ex: +55 11 99999-9999)
  // Para integração com IA
  companyId?: string;
  userToken?: string;
}

// Em-memory store para conexões
const connections = new Map<string, WhatsAppConnection>();

// Controle de reconexões para evitar loops infinitos
const reconnectionAttempts = new Map<string, number>();
const reconnectionTimers = new Map<string, NodeJS.Timeout>();
const activeAuthProcesses = new Map<string, boolean>();
const MAX_RECONNECTION_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 5000; // 5 segundos

const jidToPhone = (jid?: string): string | undefined => {
  if (!jid) return undefined;
  const decoded = jidDecode(jid);
  const rawUser = decoded?.user || jid.split('@')[0];
  if (!rawUser) return undefined;
  const numeric = rawUser.replace(/[^0-9]/g, '');
  return numeric ? `+${numeric}` : undefined;
};

/**
 * Envia mensagem recebida para backend processar AI
 */
async function sendMessageToAIBackend(
  connectionId: string,
  connection: WhatsAppConnection,
  senderJid: string,
  messageText: string
) {
  if (!connection.userId || !connection.companyId) {
    console.log(`[${new Date().toISOString()}] ⚠️ Falta userId ou companyId na conexão ${connectionId}`);
    return;
  }

  const clientRef = jidToPhone(senderJid);
  
  try {
    console.log(`[${new Date().toISOString()}] 📤 Enviando mensagem para AI backend...`);
    console.log(`   Conexão: ${connectionId}, Cliente: ${clientRef}, Mensagem: "${messageText.substring(0, 50)}..."`);

    const payload = {
      company_id: connection.companyId,
      connection_id: connectionId,
      client_ref: clientRef,
      jid: senderJid, // JID original para responder
      incoming_message: messageText,
    };

    const response = await fetch('http://localhost:3000/api/ai/suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${connection.userToken || 'anonymous'}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = (await response.json()) as any;
      console.log(`[${new Date().toISOString()}] ✅ Sugestão criada com ID: ${data.data?.id}`);
      console.log(`   Confiança: ${(data.data?.confidence_score * 100).toFixed(1)}%`);
    } else {
      const error = await response.text();
      console.error(`[${new Date().toISOString()}] ❌ Erro do backend (${response.status}):`, error);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Erro ao enviar para AI backend:`, error);
  }
}

const populateConnectionProfile = async (sock: any, connection: WhatsAppConnection) => {
  const jid = sock?.user?.id as string | undefined;
  if (!jid) return;

  const phone = jidToPhone(jid);
  if (phone) {
    connection.userPhone = phone;
    connection.phoneNumber = connection.phoneNumber || phone;
  }

  if (sock?.user?.name) {
    connection.userName = connection.userName || sock.user.name;
  }

  try {
    const statusRes = await sock.fetchStatus(jid);
    if (statusRes?.status) {
      connection.userStatus = statusRes.status;
    }
  } catch (err) {
    const errorMsg = (err as any)?.message || err;
    console.log(`[${new Date().toISOString()}] Não foi possível obter status do usuário:`, errorMsg);
  }

  try {
    const picUrl = await sock.profilePictureUrl(jid, 'image');
    if (picUrl) {
      connection.userProfilePic = picUrl;
    }
  } catch (err) {
    const errorMsg = (err as any)?.message || err;
    console.log(`[${new Date().toISOString()}] Não foi possível obter foto de perfil:`, errorMsg);
  }
};

/**
 * Salva metadados da conexão (userId, companyId, userToken)
 */
async function saveConnectionMetadata(connectionId: string, metadata: { userId?: string; companyId?: string; userToken?: string }) {
  const metadataPath = path.join(process.cwd(), 'auth_info', connectionId, 'metadata.json');
  try {
    await fs.mkdir(path.dirname(metadataPath), { recursive: true });
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro ao salvar metadados:`, error);
  }
}

/**
 * Carrega metadados da conexão (userId, companyId, userToken)
 */
async function loadConnectionMetadata(connectionId: string): Promise<{ userId?: string; companyId?: string; userToken?: string } | null> {
  const metadataPath = path.join(process.cwd(), 'auth_info', connectionId, 'metadata.json');
  try {
    const data = await fs.readFile(metadataPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

/**
 * Cria uma nova conexão WhatsApp e inicia autenticação
 */
export async function createWhatsAppConnection(userId: string, phoneNumber?: string): Promise<WhatsAppConnection> {
  const id = `conn_${Date.now()}`;
  const authDir = path.join(process.cwd(), 'auth_info', id);
  
  const connection: WhatsAppConnection = {
    id,
    userId,
    phoneNumber: phoneNumber || '',
    status: 'scanning',
    createdAt: new Date(),
  };
  
  connections.set(id, connection);

  // Salvar metadados da conexão
  await saveConnectionMetadata(id, { userId });

  // Iniciar autenticação com Baileys em background
  initiateBaileysAuth(id, authDir);

  return connection;
}

/**
 * Inicia autenticação com Baileys
 */
async function initiateBaileysAuth(connectionId: string, authDir: string) {
  try {
    // Verificar se já há um processo de autenticação ativo
    if (activeAuthProcesses.get(connectionId)) {
      console.log(`[${new Date().toISOString()}] ⚠️ Processo de autenticação já ativo para ${connectionId}, ignorando`);
      return;
    }
    
    activeAuthProcesses.set(connectionId, true);
    
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      keepAliveIntervalMs: 20000, // Keep alive a cada 20s (mais agressivo)
      connectTimeoutMs: 60000, // Timeout de 60s
      defaultQueryTimeoutMs: 60000,
      qrTimeout: 40000, // QR expira em 40s (antes eram múltiplos QRs)
      markOnlineOnConnect: true, // Marcar online ao conectar
      retryRequestDelayMs: 250,
      maxMsgRetryCount: 3,
      getMessage: async () => undefined, // Evitar erros de mensagens não encontradas
    });

    const connection = connections.get(connectionId);
    if (!connection) return;

    // Guardar socket para uso posterior
    connection.socket = sock;

    sock.ev.on('connection.update', async (update) => {
      const { connection: conn, lastDisconnect, qr } = update;
      
      console.log(`[${new Date().toISOString()}] connection.update event:`, {
        conn,
        hasQR: !!qr,
        hasLastDisconnect: !!lastDisconnect
      });

      // QR code gerado
      if (qr) {
        try {
          const qrDataUrl = await qrcode.toDataURL(qr);
          connection.qrCode = qrDataUrl;
          connection.status = 'scanning';
          console.log(`[${new Date().toISOString()}] QR Code gerado para ${connectionId}`);
          console.log(`[${new Date().toISOString()}] QR String: ${qr.substring(0, 50)}...`);
        } catch (error) {
          console.error(`Erro ao gerar QR code: ${error}`);
        }
      }

      if (conn === 'open') {
        connection.status = 'connected';
        connection.qrCode = undefined; // Limpar QR code após conexão bem-sucedida
        
        // Resetar contadores de reconexão
        reconnectionAttempts.delete(connectionId);
        activeAuthProcesses.delete(connectionId);
        
        // Limpar timers pendentes
        if (reconnectionTimers.has(connectionId)) {
          clearTimeout(reconnectionTimers.get(connectionId)!);
          reconnectionTimers.delete(connectionId);
        }
        
        console.log(`[${new Date().toISOString()}] ✅ WhatsApp CONECTADO COM SUCESSO: ${connectionId}`);
        console.log(`[${new Date().toISOString()}] Usuario: ${connection.userId} - Status: ${connection.status}`);
        await populateConnectionProfile(sock, connection);
      } else if (conn === 'connecting') {
        console.log(`[${new Date().toISOString()}] Conectando ao WhatsApp... ${connectionId}`);
      } else if (conn === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const reason = (lastDisconnect?.error as any)?.output?.payload?.message || 'Unknown';
        console.log(`[${new Date().toISOString()}] Desconectado. Status Code: ${statusCode}, Reason: ${reason}`);
        
        // 405 = QR code expirou, 401 = não autorizado, 440 = conflict
        if (statusCode === 405 || statusCode === 408) {
          console.log(`[${new Date().toISOString()}] QR code expirou (${statusCode}), aguardando scan manual`);
          connection.status = 'scanning';
          connection.qrCode = undefined;
          activeAuthProcesses.delete(connectionId);
          
          // Limpar timers pendentes
          if (reconnectionTimers.has(connectionId)) {
            clearTimeout(reconnectionTimers.get(connectionId)!);
            reconnectionTimers.delete(connectionId);
          }
          
          // NÃO reconectar automaticamente - aguardar requisição manual do frontend
          console.log(`[${new Date().toISOString()}] ℹ️ Aguardando nova requisição de QR code em /whatsapp/connections/${connectionId}/qr`);
          
        } else if (statusCode === 440) {
          console.log(`[${new Date().toISOString()}] ⚠️ Conflito detectado (conta conectada em outro lugar). Parando reconexões automáticas...`);
          connection.status = 'disconnected';
          activeAuthProcesses.delete(connectionId);
          
          // Fechar socket se estiver aberto
          try {
            if (connection.socket) {
              await connection.socket.end();
            }
          } catch (err) {
            console.log(`[${new Date().toISOString()}] Socket já estava fechado`);
          }
          
          // Limpar timers de reconexão pendentes
          if (reconnectionTimers.has(connectionId)) {
            clearTimeout(reconnectionTimers.get(connectionId)!);
            reconnectionTimers.delete(connectionId);
          }
          
          // Resetar contadores
          reconnectionAttempts.delete(connectionId);
          
          // Limpar arquivos de autenticação para forçar novo QR code
          try {
            const authDir = path.join(process.cwd(), 'auth_info', connectionId);
            const fs = require('fs').promises;
            const credsPath = path.join(authDir, 'creds.json');
            try {
              await fs.unlink(credsPath);
              console.log(`[${new Date().toISOString()}] Credenciais limpas, novo QR será gerado`);
            } catch (e) {
              // arquivo já não existe
            }
          } catch (err) {
            console.log(`[${new Date().toISOString()}] Erro ao limpar credenciais:`, err);
          }
          
          connection.qrCode = undefined;
          connection.status = 'scanning';
          
          // IMPORTANTE: Não reconectar automaticamente em caso de conflito
          // Usuário precisará escanear novo QR code manualmente
          console.log(`[${new Date().toISOString()}] ℹ️ Conexão ${connectionId} aguardando novo QR scan. Acesse /whatsapp/connections/${connectionId}/qr`);
          
        } else if (statusCode !== 401) {
          connection.status = 'disconnected';
          activeAuthProcesses.delete(connectionId);
          
          // Implementar exponential backoff
          const attempts = reconnectionAttempts.get(connectionId) || 0;
          
          if (attempts >= MAX_RECONNECTION_ATTEMPTS) {
            console.log(`[${new Date().toISOString()}] ❌ Máximo de tentativas de reconexão atingido para ${connectionId}`);
            reconnectionAttempts.delete(connectionId);
            return;
          }
          
          reconnectionAttempts.set(connectionId, attempts + 1);
          const delay = BASE_RECONNECT_DELAY * Math.pow(2, attempts); // 5s, 10s, 20s, 40s, 80s
          
          console.log(`[${new Date().toISOString()}] 🔄 Tentativa ${attempts + 1}/${MAX_RECONNECTION_ATTEMPTS} em ${delay}ms`);
          
          // Limpar timer anterior se existir
          if (reconnectionTimers.has(connectionId)) {
            clearTimeout(reconnectionTimers.get(connectionId)!);
          }
          
          const timer = setTimeout(() => {
            reconnectionTimers.delete(connectionId);
            initiateBaileysAuth(connectionId, authDir);
          }, delay);
          
          reconnectionTimers.set(connectionId, timer);
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);

    // Listener para mensagens recebidas (webhook para AI)
    sock.ev.on('messages.upsert', async (m: { messages: WAMessage[] }) => {
      try {
        for (const msg of m.messages) {
          // Apenas processar mensagens recebidas (não enviadas pelo usuário)
          if (!msg.key.fromMe) {
            const senderJid = msg.key.remoteJid;
            const messageText =
              msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text ||
              '';

            if (messageText && senderJid) {
              console.log(`[${new Date().toISOString()}] 📨 Mensagem recebida de ${senderJid}: "${messageText.substring(0, 50)}..."`);
              
              // Enviar para AI backend criar sugestão
              await sendMessageToAIBackend(connectionId, connection, senderJid, messageText);
            }
          }
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Erro ao processar mensagens:`, error);
      }
    });


    // Capturar informações do usuário autenticado
    sock.ev.on('contacts.update', (contacts) => {
      contacts.forEach((contact) => {
        const phoneFromJid = jidToPhone(contact.id);
        console.log(`[${new Date().toISOString()}] 📱 Informações do contato atualizadas:`, {
          id: contact.id,
          name: contact.name,
          notify: contact.notify,
          status: contact.status,
        });

        if (phoneFromJid) {
          connection.userPhone = connection.userPhone || phoneFromJid;
          connection.phoneNumber = connection.phoneNumber || phoneFromJid;
        }

        if (contact.name) connection.userName = contact.name;
        if (!connection.userName && contact.notify) connection.userName = contact.notify;
        if (contact.status) connection.userStatus = contact.status;
      });
    });

    // Tentar obter profile picture
    try {
      sock.ev.on('presence.update', async (presences) => {
        for (const [jid, presence] of Object.entries(presences)) {
          if (jid === connection.phoneNumber) {
            console.log(`[${new Date().toISOString()}] 👤 Presença do usuário: ${jid}`, presence);
          }
        }
      });
    } catch (err) {
      console.log('Presença listener não disponível');
    }

  } catch (error) {
    console.error(`Erro ao iniciar autenticação para ${connectionId}:`, error);
    const connection = connections.get(connectionId);
    if (connection) {
      connection.status = 'disconnected';
    }
  }
}

/**
 * Obtém conexão pelo ID
 */
export function getConnection(connectionId: string): WhatsAppConnection | undefined {
  return connections.get(connectionId);
}

/**
 * Lista conexões de um usuário
 */
export function getUserConnections(userId: string): WhatsAppConnection[] {
  return Array.from(connections.values()).filter(c => c.userId === userId);
}

/**
 * Atualiza status da conexão
 */
export function updateConnectionStatus(
  connectionId: string,
  status: WhatsAppConnection['status'],
  qrCode?: string
): WhatsAppConnection | undefined {
  const connection = connections.get(connectionId);
  if (!connection) return undefined;
  
  connection.status = status;
  if (qrCode) connection.qrCode = qrCode;
  
  return connection;
}

/**
 * Remove uma conexão
 */
export async function removeConnection(connectionId: string): Promise<boolean> {
  const connection = connections.get(connectionId);
  
  // Limpar processos ativos e timers
  activeAuthProcesses.delete(connectionId);
  reconnectionAttempts.delete(connectionId);
  
  if (reconnectionTimers.has(connectionId)) {
    clearTimeout(reconnectionTimers.get(connectionId)!);
    reconnectionTimers.delete(connectionId);
  }
  
  if (connection && connection.socket) {
    try {
      // Envia sinal de logout para forçar desconexão no dispositivo
      await connection.socket.logout();
    } catch (err) {
      console.log(`[${new Date().toISOString()}] Erro ao deslogar socket:`, (err as any)?.message || err);
    }

    try {
      connection.socket.end();
    } catch (err) {
      console.log(`[${new Date().toISOString()}] Erro ao finalizar socket:`, (err as any)?.message || err);
    }
  }
  
  // Limpar arquivos de autenticação para forçar novo QR code na próxima conexão
  try {
    const authDir = path.join(process.cwd(), 'auth_info', connectionId);
    const files = await fs.readdir(authDir);
    
    for (const file of files) {
      const filePath = path.join(authDir, file);
      const stat = await fs.stat(filePath);
      
      if (stat.isDirectory()) {
        // Remover diretórios
        const dirFiles = await fs.readdir(filePath);
        for (const dirFile of dirFiles) {
          await fs.unlink(path.join(filePath, dirFile));
        }
        // Não remover o diretório em si, apenas seus conteúdos
      } else {
        // Remover arquivo
        await fs.unlink(filePath);
      }
    }
    
    console.log(`[${new Date().toISOString()}] 🗑️  Arquivos de autenticação removidos para ${connectionId}`);
  } catch (err) {
    console.log(`[${new Date().toISOString()}] ⚠️  Aviso ao limpar arquivos: ${(err as any)?.message || err}`);
  }
  
  return connections.delete(connectionId);
}

/**
 * Carrega e reconecta todas as conexões salvas
 */
export async function loadSavedConnections(): Promise<void> {
  const authInfoDir = path.join(process.cwd(), 'auth_info');
  
  try {
    // Verifica se o diretório auth_info existe
    await fs.mkdir(authInfoDir, { recursive: true });
    
    const folders = await fs.readdir(authInfoDir);
    console.log(`[${new Date().toISOString()}] 🔄 Carregando conexões salvas: ${folders.length} encontradas`);
    
    for (const folder of folders) {
      // Verifica se começa com 'conn_' para garantir que é uma pasta de conexão
      if (!folder.startsWith('conn_')) {
        continue;
      }
      
      const connectionId = folder;
      const authDir = path.join(authInfoDir, connectionId);
      
      // Verifica se há credenciais salvas nesta pasta
      try {
        const files = await fs.readdir(authDir);
        if (files.length === 0) {
          console.log(`[${new Date().toISOString()}] ⏭️  Pulando ${connectionId}: sem credenciais`);
          continue;
        }
        
        console.log(`[${new Date().toISOString()}] 🔌 Reconectando ${connectionId}...`);
        
        // Carregar metadados salvos
        const metadataPath = path.join(authDir, 'metadata.json');
        console.log(`[${new Date().toISOString()}] 📁 Procurando metadados em: ${metadataPath}`);
        const metadata = await loadConnectionMetadata(connectionId);
        console.log(`[${new Date().toISOString()}] 📄 Metadados lidos:`, JSON.stringify(metadata));
        
        // Criar uma conexão básica (será preenchida pelo Baileys)
        const connection: WhatsAppConnection = {
          id: connectionId,
          userId: metadata?.userId || 'unknown',
          phoneNumber: '',
          status: 'connecting',
          createdAt: new Date(),
          companyId: metadata?.companyId,
          userToken: metadata?.userToken,
        };
        
        connections.set(connectionId, connection);
        
        console.log(`[${new Date().toISOString()}] 📋 Metadados carregados - userId: ${connection.userId}, companyId: ${connection.companyId}`);
        
        // Tentar reconectar usando as credenciais salvas
        initiateBaileysAuth(connectionId, authDir);
        
        // Aguardar 5 segundos antes de tentar a próxima conexão (evitar sobrecarga)
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (err) {
        console.error(`[${new Date().toISOString()}] ❌ Erro ao processar ${connectionId}:`, (err as any)?.message || err);
      }
    }
    
    console.log(`[${new Date().toISOString()}] ✅ Processo de reconexão iniciado para todas as conexões salvas`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Erro ao carregar conexões salvas:`, error);
  }
}

/**
 * Retorna todas as conexões ativas
 */
export function getAllConnections(): WhatsAppConnection[] {
  return Array.from(connections.values());
}

/**
 * Exporta função para salvar metadados (usado em rotas)
 */
export { saveConnectionMetadata };
