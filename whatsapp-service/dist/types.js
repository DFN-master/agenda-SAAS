"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWhatsAppConnection = createWhatsAppConnection;
exports.getConnection = getConnection;
exports.getUserConnections = getUserConnections;
exports.updateConnectionStatus = updateConnectionStatus;
exports.removeConnection = removeConnection;
exports.loadSavedConnections = loadSavedConnections;
exports.getAllConnections = getAllConnections;
exports.saveConnectionMetadata = saveConnectionMetadata;
const baileys_1 = __importStar(require("@whiskeysockets/baileys"));
const qrcode_1 = __importDefault(require("qrcode"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const node_fetch_1 = __importDefault(require("node-fetch"));
// Em-memory store para conexões
const connections = new Map();
const jidToPhone = (jid) => {
    if (!jid)
        return undefined;
    const decoded = (0, baileys_1.jidDecode)(jid);
    const rawUser = decoded?.user || jid.split('@')[0];
    if (!rawUser)
        return undefined;
    const numeric = rawUser.replace(/[^0-9]/g, '');
    return numeric ? `+${numeric}` : undefined;
};
/**
 * Envia mensagem recebida para backend processar AI
 */
async function sendMessageToAIBackend(connectionId, connection, senderJid, messageText) {
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
        const response = await (0, node_fetch_1.default)('http://localhost:3000/api/ai/suggestions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${connection.userToken || 'anonymous'}`,
            },
            body: JSON.stringify(payload),
        });
        if (response.ok) {
            const data = (await response.json());
            console.log(`[${new Date().toISOString()}] ✅ Sugestão criada com ID: ${data.data?.id}`);
            console.log(`   Confiança: ${(data.data?.confidence_score * 100).toFixed(1)}%`);
        }
        else {
            const error = await response.text();
            console.error(`[${new Date().toISOString()}] ❌ Erro do backend (${response.status}):`, error);
        }
    }
    catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Erro ao enviar para AI backend:`, error);
    }
}
const populateConnectionProfile = async (sock, connection) => {
    const jid = sock?.user?.id;
    if (!jid)
        return;
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
    }
    catch (err) {
        const errorMsg = err?.message || err;
        console.log(`[${new Date().toISOString()}] Não foi possível obter status do usuário:`, errorMsg);
    }
    try {
        const picUrl = await sock.profilePictureUrl(jid, 'image');
        if (picUrl) {
            connection.userProfilePic = picUrl;
        }
    }
    catch (err) {
        const errorMsg = err?.message || err;
        console.log(`[${new Date().toISOString()}] Não foi possível obter foto de perfil:`, errorMsg);
    }
};
/**
 * Salva metadados da conexão (userId, companyId, userToken)
 */
async function saveConnectionMetadata(connectionId, metadata) {
    const metadataPath = path_1.default.join(process.cwd(), 'auth_info', connectionId, 'metadata.json');
    try {
        await fs_1.promises.mkdir(path_1.default.dirname(metadataPath), { recursive: true });
        await fs_1.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    }
    catch (error) {
        console.error(`[${new Date().toISOString()}] Erro ao salvar metadados:`, error);
    }
}
/**
 * Carrega metadados da conexão (userId, companyId, userToken)
 */
async function loadConnectionMetadata(connectionId) {
    const metadataPath = path_1.default.join(process.cwd(), 'auth_info', connectionId, 'metadata.json');
    try {
        const data = await fs_1.promises.readFile(metadataPath, 'utf-8');
        return JSON.parse(data);
    }
    catch (error) {
        return null;
    }
}
/**
 * Cria uma nova conexão WhatsApp e inicia autenticação
 */
async function createWhatsAppConnection(userId, phoneNumber) {
    const id = `conn_${Date.now()}`;
    const authDir = path_1.default.join(process.cwd(), 'auth_info', id);
    const connection = {
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
async function initiateBaileysAuth(connectionId, authDir) {
    try {
        const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)(authDir);
        const sock = (0, baileys_1.default)({
            auth: state,
            printQRInTerminal: false,
            keepAliveIntervalMs: 30000, // Keep alive para evitar desconexão
        });
        const connection = connections.get(connectionId);
        if (!connection)
            return;
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
                    const qrDataUrl = await qrcode_1.default.toDataURL(qr);
                    connection.qrCode = qrDataUrl;
                    connection.status = 'scanning';
                    console.log(`[${new Date().toISOString()}] QR Code gerado para ${connectionId}`);
                    console.log(`[${new Date().toISOString()}] QR String: ${qr.substring(0, 50)}...`);
                }
                catch (error) {
                    console.error(`Erro ao gerar QR code: ${error}`);
                }
            }
            if (conn === 'open') {
                connection.status = 'connected';
                connection.qrCode = undefined; // Limpar QR code após conexão bem-sucedida
                console.log(`[${new Date().toISOString()}] ✅ WhatsApp CONECTADO COM SUCESSO: ${connectionId}`);
                console.log(`[${new Date().toISOString()}] Usuario: ${connection.userId} - Status: ${connection.status}`);
                await populateConnectionProfile(sock, connection);
            }
            else if (conn === 'connecting') {
                console.log(`[${new Date().toISOString()}] Conectando ao WhatsApp... ${connectionId}`);
            }
            else if (conn === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const reason = lastDisconnect?.error?.output?.payload?.message || 'Unknown';
                console.log(`[${new Date().toISOString()}] Desconectado. Status Code: ${statusCode}, Reason: ${reason}`);
                // 405 = QR code expirou, 401 = não autorizado, 440 = conflict
                if (statusCode === 405) {
                    console.log(`[${new Date().toISOString()}] QR code expirou, será regenerado`);
                    connection.status = 'disconnected';
                    connection.qrCode = undefined;
                    // Reconectar para gerar novo QR code
                    setTimeout(() => {
                        console.log(`[${new Date().toISOString()}] Tentando reconectar ${connectionId}`);
                        initiateBaileysAuth(connectionId, authDir);
                    }, 2000);
                }
                else if (statusCode === 440) {
                    console.log(`[${new Date().toISOString()}] ⚠️ Conflito detectado (conta conectada em outro lugar). Limpando sessão...`);
                    connection.status = 'disconnected';
                    // Fechar socket se estiver aberto
                    try {
                        if (connection.socket) {
                            await connection.socket.end();
                        }
                    }
                    catch (err) {
                        console.log(`[${new Date().toISOString()}] Socket já estava fechado`);
                    }
                    // Limpar arquivos de autenticação para forçar novo QR code
                    try {
                        const authDir = path_1.default.join(process.cwd(), 'auth_info', connectionId);
                        const fs = require('fs').promises;
                        // Não deletar tudo, apenas limpar credenciais corruptas
                        const credsPath = path_1.default.join(authDir, 'creds.json');
                        try {
                            await fs.unlink(credsPath);
                            console.log(`[${new Date().toISOString()}] Credenciais limpas, novo QR será gerado`);
                        }
                        catch (e) {
                            // arquivo já não existe
                        }
                    }
                    catch (err) {
                        console.log(`[${new Date().toISOString()}] Erro ao limpar credenciais:`, err);
                    }
                    connection.qrCode = undefined;
                    connection.status = 'scanning';
                    // Aguardar antes de reconectar
                    setTimeout(() => {
                        console.log(`[${new Date().toISOString()}] Reconectando com nova sessão...`);
                        initiateBaileysAuth(connectionId, authDir);
                    }, 10000);
                }
                else if (statusCode !== 401) {
                    connection.status = 'disconnected';
                    // Tentar reconectar
                    setTimeout(() => {
                        initiateBaileysAuth(connectionId, authDir);
                    }, 5000);
                }
            }
        });
        sock.ev.on('creds.update', saveCreds);
        // Listener para mensagens recebidas (webhook para AI)
        sock.ev.on('messages.upsert', async (m) => {
            try {
                for (const msg of m.messages) {
                    // Apenas processar mensagens recebidas (não enviadas pelo usuário)
                    if (!msg.key.fromMe) {
                        const senderJid = msg.key.remoteJid;
                        const messageText = msg.message?.conversation ||
                            msg.message?.extendedTextMessage?.text ||
                            '';
                        if (messageText && senderJid) {
                            console.log(`[${new Date().toISOString()}] 📨 Mensagem recebida de ${senderJid}: "${messageText.substring(0, 50)}..."`);
                            // Enviar para AI backend criar sugestão
                            await sendMessageToAIBackend(connectionId, connection, senderJid, messageText);
                        }
                    }
                }
            }
            catch (error) {
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
                if (contact.name)
                    connection.userName = contact.name;
                if (!connection.userName && contact.notify)
                    connection.userName = contact.notify;
                if (contact.status)
                    connection.userStatus = contact.status;
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
        }
        catch (err) {
            console.log('Presença listener não disponível');
        }
    }
    catch (error) {
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
function getConnection(connectionId) {
    return connections.get(connectionId);
}
/**
 * Lista conexões de um usuário
 */
function getUserConnections(userId) {
    return Array.from(connections.values()).filter(c => c.userId === userId);
}
/**
 * Atualiza status da conexão
 */
function updateConnectionStatus(connectionId, status, qrCode) {
    const connection = connections.get(connectionId);
    if (!connection)
        return undefined;
    connection.status = status;
    if (qrCode)
        connection.qrCode = qrCode;
    return connection;
}
/**
 * Remove uma conexão
 */
async function removeConnection(connectionId) {
    const connection = connections.get(connectionId);
    if (connection && connection.socket) {
        try {
            // Envia sinal de logout para forçar desconexão no dispositivo
            await connection.socket.logout();
        }
        catch (err) {
            console.log(`[${new Date().toISOString()}] Erro ao deslogar socket:`, err?.message || err);
        }
        try {
            connection.socket.end();
        }
        catch (err) {
            console.log(`[${new Date().toISOString()}] Erro ao finalizar socket:`, err?.message || err);
        }
    }
    return connections.delete(connectionId);
}
/**
 * Carrega e reconecta todas as conexões salvas
 */
async function loadSavedConnections() {
    const authInfoDir = path_1.default.join(process.cwd(), 'auth_info');
    try {
        // Verifica se o diretório auth_info existe
        await fs_1.promises.mkdir(authInfoDir, { recursive: true });
        const folders = await fs_1.promises.readdir(authInfoDir);
        console.log(`[${new Date().toISOString()}] 🔄 Carregando conexões salvas: ${folders.length} encontradas`);
        for (const folder of folders) {
            // Verifica se começa com 'conn_' para garantir que é uma pasta de conexão
            if (!folder.startsWith('conn_')) {
                continue;
            }
            const connectionId = folder;
            const authDir = path_1.default.join(authInfoDir, connectionId);
            // Verifica se há credenciais salvas nesta pasta
            try {
                const files = await fs_1.promises.readdir(authDir);
                if (files.length === 0) {
                    console.log(`[${new Date().toISOString()}] ⏭️  Pulando ${connectionId}: sem credenciais`);
                    continue;
                }
                console.log(`[${new Date().toISOString()}] 🔌 Reconectando ${connectionId}...`);
                // Carregar metadados salvos
                const metadataPath = path_1.default.join(authDir, 'metadata.json');
                console.log(`[${new Date().toISOString()}] 📁 Procurando metadados em: ${metadataPath}`);
                const metadata = await loadConnectionMetadata(connectionId);
                console.log(`[${new Date().toISOString()}] 📄 Metadados lidos:`, JSON.stringify(metadata));
                // Criar uma conexão básica (será preenchida pelo Baileys)
                const connection = {
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
                // Aguardar um pouco antes de tentar a próxima conexão
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            catch (err) {
                console.error(`[${new Date().toISOString()}] ❌ Erro ao processar ${connectionId}:`, err?.message || err);
            }
        }
        console.log(`[${new Date().toISOString()}] ✅ Processo de reconexão iniciado para todas as conexões salvas`);
    }
    catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Erro ao carregar conexões salvas:`, error);
    }
}
/**
 * Retorna todas as conexões ativas
 */
function getAllConnections() {
    return Array.from(connections.values());
}
//# sourceMappingURL=types.js.map