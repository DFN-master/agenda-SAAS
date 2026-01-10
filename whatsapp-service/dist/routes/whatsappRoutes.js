"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const router = express_1.default.Router();
// URL do serviço Whatsmeow em Go
const WHATSMEOW_API = process.env.WHATSMEOW_API || 'http://localhost:4000';
/**
 * POST /whatsapp/connect
 * Inicia novo fluxo de autenticação com QR code
 */
router.post('/connect', async (req, res) => {
    try {
        const { company_id, user_id } = req.body;
        if (!company_id || !user_id) {
            return res.status(400).json({ message: 'company_id e user_id obrigatórios' });
        }
        const response = await (0, node_fetch_1.default)(`${WHATSMEOW_API}/api/whatsapp/connect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ company_id, user_id }),
        });
        if (!response.ok) {
            throw new Error(`Whatsmeow API error: ${response.statusText}`);
        }
        const data = await response.json();
        res.json(data);
    }
    catch (error) {
        console.error('[WhatsApp] Connect error:', error);
        res.status(500).json({ message: 'Erro ao conectar', error: String(error) });
    }
});
/**
 * POST /whatsapp/connections
 * (DEPRECATED) Cria uma nova conexão WhatsApp - agora usa /connect
 */
router.post('/connections', async (req, res) => {
    try {
        const { userId, companyId } = req.body;
        if (!userId || !companyId) {
            return res.status(400).json({ error: 'userId e companyId obrigatórios' });
        }
        // Redirecionar para novo endpoint
        const response = await (0, node_fetch_1.default)(`${WHATSMEOW_API}/api/whatsapp/connect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ company_id: companyId, user_id: userId }),
        });
        if (!response.ok) {
            throw new Error(`Whatsmeow API error: ${response.statusText}`);
        }
        const data = await response.json();
        res.status(201).json({
            connectionId: data.connection_id,
            status: data.status,
            message: 'Escaneie o QR code com seu WhatsApp',
        });
    }
    catch (error) {
        console.error('Error creating connection:', error);
        res.status(500).json({ error: 'Falha ao criar conexão' });
    }
});
/**
 * GET /whatsapp/qr
 * Retorna status de uma conexão e QR code se necessário
 */
router.get('/qr', async (req, res) => {
    try {
        const { connection_id } = req.query;
        if (!connection_id) {
            return res.status(400).json({ message: 'connection_id obrigatório' });
        }
        const response = await (0, node_fetch_1.default)(`${WHATSMEOW_API}/api/whatsapp/qr?connection_id=${connection_id}`);
        if (!response.ok) {
            throw new Error(`Whatsmeow API error: ${response.statusText}`);
        }
        const data = await response.json();
        res.json(data);
    }
    catch (error) {
        console.error('[WhatsApp] QR error:', error);
        res.status(500).json({ message: 'Erro ao obter QR', error: String(error) });
    }
});
/**
 * GET /whatsapp/connections/:connectionId/qr
 * (DEPRECATED) Obtém o QR code - agora usa /qr
 */
router.get('/connections/:connectionId/qr', async (req, res) => {
    try {
        const { connectionId } = req.params;
        console.log(`GET QR code para: ${connectionId}`);
        const response = await (0, node_fetch_1.default)(`${WHATSMEOW_API}/api/whatsapp/qr?connection_id=${connectionId}`);
        if (!response.ok) {
            if (response.status === 404) {
                return res.status(404).json({ error: 'Conexão não encontrada' });
            }
            throw new Error(`Whatsmeow API error: ${response.statusText}`);
        }
        const data = await response.json();
        // Compatibilidade com código antigo
        if (data.status === 'authenticated') {
            return res.json({
                status: 'connected',
                jid: data.jid,
            });
        }
        res.json({
            status: data.status,
            qrCode: data.qr_code,
        });
    }
    catch (error) {
        console.error('Error getting QR code:', error);
        res.status(500).json({ error: 'Falha ao obter QR code' });
    }
});
/**
 * GET /whatsapp/connections/:connectionId/status
 * (DEPRECATED) Obtém status - agora usa /status
 */
router.get('/connections/:connectionId/status', async (req, res) => {
    try {
        const { connectionId } = req.params;
        const response = await (0, node_fetch_1.default)(`${WHATSMEOW_API}/api/whatsapp/qr?connection_id=${connectionId}`);
        if (!response.ok) {
            return res.status(404).json({ error: 'Conexão não encontrada' });
        }
        const data = await response.json();
        res.json({
            connectionId: connectionId,
            status: data.status === 'authenticated' ? 'connected' : data.status,
            jid: data.jid || null,
        });
    }
    catch (error) {
        console.error('Error getting status:', error);
        res.status(500).json({ error: 'Falha ao obter status' });
    }
});
/**
 * DELETE /whatsapp/connections/:connectionId
 * Desconecta e remove a conexão
 */
router.delete('/connections/:connectionId', async (req, res) => {
    try {
        const { connectionId } = req.params;
        const response = await (0, node_fetch_1.default)(`${WHATSMEOW_API}/api/whatsapp/disconnect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ connection_id: connectionId }),
        });
        if (!response.ok) {
            return res.status(404).json({ error: 'Conexão não encontrada' });
        }
        res.json({ message: 'Conexão removida com sucesso' });
    }
    catch (error) {
        console.error('Error removing connection:', error);
        res.status(500).json({ error: 'Falha ao remover conexão' });
    }
});
/**
 * POST /whatsapp/connections/reconnect-all
 * Força reconexão de todas as conexões WhatsApp salvas
 */
router.post('/connections/reconnect-all', async (req, res) => {
    try {
        const response = await (0, node_fetch_1.default)(`${WHATSMEOW_API}/api/whatsapp/connections`);
        if (!response.ok) {
            throw new Error(`Whatsmeow API error: ${response.statusText}`);
        }
        const data = await response.json();
        res.json({
            success: true,
            message: 'Reconexão iniciada para todas as conexões salvas',
            connectionsCount: data.count,
            connections: data.connections || [],
        });
    }
    catch (error) {
        console.error('Error reconnecting all connections:', error);
        res.status(500).json({ error: 'Falha ao reconectar conexões' });
    }
});
/**
 * POST /whatsapp/send
 * Envia uma mensagem via WhatsApp
 */
router.post('/send', async (req, res) => {
    try {
        const { connection_id, to, text, company_id } = req.body;
        if (!connection_id || !to || !text) {
            return res.status(400).json({
                message: 'connection_id, to, text obrigatórios'
            });
        }
        // Log
        console.log(`[WhatsApp] Enviando para ${to} via conexão ${connection_id} (company: ${company_id})`);
        const response = await (0, node_fetch_1.default)(`${WHATSMEOW_API}/api/whatsapp/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ connection_id, to, text }),
        });
        if (!response.ok) {
            throw new Error(`Whatsmeow API error: ${response.statusText}`);
        }
        const data = await response.json();
        res.json(data);
    }
    catch (error) {
        console.error('[WhatsApp] Send error:', error);
        res.status(500).json({ message: 'Erro ao enviar mensagem', error: String(error) });
    }
});
/**
 * POST /whatsapp/connections/:connectionId/send-message
 * (DEPRECATED) Envia mensagem - agora usa /send
 */
router.post('/connections/:connectionId/send-message', async (req, res) => {
    try {
        const { connectionId } = req.params;
        const { jid, message } = req.body;
        if (!jid || !message) {
            return res.status(400).json({ error: 'jid e message são obrigatórios' });
        }
        const response = await (0, node_fetch_1.default)(`${WHATSMEOW_API}/api/whatsapp/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ connection_id: connectionId, to: jid, text: message }),
        });
        if (!response.ok) {
            return res.status(503).json({ error: 'Conexão WhatsApp não está ativa' });
        }
        const data = await response.json();
        console.log(`[${new Date().toISOString()}] 📤 Mensagem enviada para ${jid}`);
        res.json({ success: true, message: 'Mensagem enviada' });
    }
    catch (error) {
        console.error('Error in send-message endpoint:', error);
        res.status(500).json({ error: 'Erro interno ao processar requisição' });
    }
});
exports.default = router;
//# sourceMappingURL=whatsappRoutes.js.map