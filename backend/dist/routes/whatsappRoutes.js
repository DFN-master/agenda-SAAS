"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const whatsappService_1 = require("../services/whatsapp/whatsappService");
const aiConversationService_1 = require("../services/ai/aiConversationService");
const whatsappNotificationService_1 = require("../services/whatsapp/whatsappNotificationService");
const models_1 = __importDefault(require("../models"));
const router = express_1.default.Router();
// Middleware para validar company_id do usuário
const getCompanyId = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const companyId = String(req.query.company_id || req.body.company_id || '').trim();
    if (!companyId) {
        return res.status(400).json({ error: 'company_id é obrigatório' });
    }
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(companyId)) {
        return res.status(400).json({ error: 'company_id deve ser um UUID' });
    }
    const user = yield models_1.default.User.findByPk(userId, {
        include: [{ model: models_1.default.Company, through: { attributes: [] } }],
    });
    const userCompanies = (user === null || user === void 0 ? void 0 : user.Companies) || [];
    const belongsToCompany = userCompanies.some((c) => String(c.id) === companyId);
    if (!user || !belongsToCompany) {
        return res.status(403).json({ error: 'Unauthorized company access' });
    }
    req.companyId = companyId;
    next();
});
/**
 * Inbound webhook para mensagens do WhatsApp
 * Body: { company_id, connection_id, jid (ou client_ref), message_text }
 */
router.post('/webhook', getCompanyId, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const companyId = req.companyId;
        const { connection_id, jid, client_ref, message_text } = req.body;
        console.log('[WEBHOOK] Received:', { connection_id, jid, client_ref, message_text: message_text === null || message_text === void 0 ? void 0 : message_text.substring(0, 50) });
        // Buscar o ID numérico da conexão no banco se receber uma string "conn_*"
        let normalizedConnectionId;
        if (connection_id) {
            if (Number.isFinite(Number(connection_id))) {
                // Se já é um número, usa direto
                normalizedConnectionId = Number(connection_id);
                console.log('[WEBHOOK] connection_id is number:', normalizedConnectionId);
            }
            else if (typeof connection_id === 'string' && connection_id.startsWith('conn_')) {
                // Se é uma string "conn_*", busca no banco
                console.log('[WEBHOOK] Searching for connection_id in database:', connection_id);
                const conn = yield models_1.default.UserConnection.findOne({
                    where: { connection_id: connection_id, status: 'active' }
                });
                if (conn) {
                    normalizedConnectionId = conn.id;
                    console.log('[WEBHOOK] Found connection with id:', normalizedConnectionId);
                }
                else {
                    console.log('[WEBHOOK] Connection not found in database');
                }
            }
        }
        if (!message_text) {
            return res.status(400).json({ error: 'message_text é obrigatório' });
        }
        const suggestion = yield (0, aiConversationService_1.createConversationSuggestion)({
            userId,
            companyId,
            connectionId: normalizedConnectionId,
            clientRef: client_ref,
            clientJid: jid, // JID original (LID/JID)
            incomingMessage: message_text,
        });
        res.status(201).json({ data: suggestion });
    }
    catch (error) {
        console.error('WhatsApp webhook error:', error);
        res.status(500).json({ error: 'Failed to process webhook' });
    }
}));
/**
 * Envio de mensagens de saída via WhatsApp
 * Params: connectionId (não utilizado em instância única)
 * Body: { jid, message }
 */
router.post('/connections/:connectionId/send-message', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { jid, message } = req.body;
        const { connectionId } = req.params;
        if (!jid || !message) {
            return res.status(400).json({ error: 'jid e message são obrigatórios' });
        }
        yield (0, whatsappService_1.sendTextMessage)(String(connectionId), jid, message);
        res.json({ success: true });
    }
    catch (error) {
        console.error('WhatsApp send-message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
}));
/**
 * POST /whatsapp/send
 * Envia mensagem simples para um número de telefone
 * Body: { company_id, phone, message }
 */
router.post('/send', getCompanyId, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = req.companyId;
        const { phone, message } = req.body;
        if (!phone || !message) {
            return res.status(400).json({ error: 'phone e message são obrigatórios' });
        }
        const connectionId = yield (0, whatsappNotificationService_1.getActiveConnectionId)(companyId);
        if (!connectionId) {
            return res.status(404).json({ error: 'Nenhuma conexão WhatsApp ativa encontrada' });
        }
        const sent = yield (0, whatsappNotificationService_1.sendCustomMessage)(connectionId, phone, message);
        if (!sent) {
            return res.status(500).json({ error: 'Falha ao enviar mensagem' });
        }
        res.json({
            success: true,
            message: 'Mensagem enviada com sucesso',
            jid: (0, whatsappNotificationService_1.formatPhoneToJid)(phone),
        });
    }
    catch (error) {
        console.error('WhatsApp send error:', error);
        res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
}));
/**
 * POST /whatsapp/send-reminder
 * Envia lembrete de agendamento
 * Body: { company_id, phone, clientName, date, time, service?, location? }
 */
router.post('/send-reminder', getCompanyId, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = req.companyId;
        const { phone, clientName, date, time, service, location } = req.body;
        if (!phone || !clientName || !date || !time) {
            return res.status(400).json({
                error: 'phone, clientName, date e time são obrigatórios'
            });
        }
        const result = yield (0, whatsappNotificationService_1.sendAutoAppointmentReminder)(companyId, phone, {
            clientName,
            date,
            time,
            service,
            location,
        });
        if (!result.success) {
            return res.status(500).json({ error: result.error });
        }
        res.json({
            success: true,
            message: 'Lembrete enviado com sucesso',
            jid: (0, whatsappNotificationService_1.formatPhoneToJid)(phone),
        });
    }
    catch (error) {
        console.error('WhatsApp send-reminder error:', error);
        res.status(500).json({ error: 'Erro ao enviar lembrete' });
    }
}));
/**
 * POST /whatsapp/send-confirmation
 * Envia confirmação de agendamento
 * Body: { company_id, phone, clientName, date, time, service?, confirmationCode? }
 */
router.post('/send-confirmation', getCompanyId, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = req.companyId;
        const { phone, clientName, date, time, service, confirmationCode } = req.body;
        if (!phone || !clientName || !date || !time) {
            return res.status(400).json({
                error: 'phone, clientName, date e time são obrigatórios'
            });
        }
        const connectionId = yield (0, whatsappNotificationService_1.getActiveConnectionId)(companyId);
        if (!connectionId) {
            return res.status(404).json({ error: 'Nenhuma conexão WhatsApp ativa encontrada' });
        }
        const sent = yield (0, whatsappNotificationService_1.sendAppointmentConfirmation)(connectionId, phone, {
            clientName,
            date,
            time,
            service,
            confirmationCode,
        });
        if (!sent) {
            return res.status(500).json({ error: 'Falha ao enviar confirmação' });
        }
        res.json({
            success: true,
            message: 'Confirmação enviada com sucesso',
            jid: (0, whatsappNotificationService_1.formatPhoneToJid)(phone),
        });
    }
    catch (error) {
        console.error('WhatsApp send-confirmation error:', error);
        res.status(500).json({ error: 'Erro ao enviar confirmação' });
    }
}));
/**
 * POST /whatsapp/send-cancellation
 * Envia notificação de cancelamento
 * Body: { company_id, phone, clientName, date, time, reason? }
 */
router.post('/send-cancellation', getCompanyId, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = req.companyId;
        const { phone, clientName, date, time, reason } = req.body;
        if (!phone || !clientName || !date || !time) {
            return res.status(400).json({
                error: 'phone, clientName, date e time são obrigatórios'
            });
        }
        const connectionId = yield (0, whatsappNotificationService_1.getActiveConnectionId)(companyId);
        if (!connectionId) {
            return res.status(404).json({ error: 'Nenhuma conexão WhatsApp ativa encontrada' });
        }
        const sent = yield (0, whatsappNotificationService_1.sendAppointmentCancellation)(connectionId, phone, {
            clientName,
            date,
            time,
            reason,
        });
        if (!sent) {
            return res.status(500).json({ error: 'Falha ao enviar cancelamento' });
        }
        res.json({
            success: true,
            message: 'Notificação de cancelamento enviada',
            jid: (0, whatsappNotificationService_1.formatPhoneToJid)(phone),
        });
    }
    catch (error) {
        console.error('WhatsApp send-cancellation error:', error);
        res.status(500).json({ error: 'Erro ao enviar notificação de cancelamento' });
    }
}));
/**
 * POST /whatsapp/connect
 * Inicia novo fluxo de autenticação com QR code
 * Redireciona para o serviço Whatsmeow (porta 4000)
 * Body: { company_id, user_id? }
 */
router.post('/connect', getCompanyId, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = req.companyId;
        const userId = req.userId;
        // Chamar serviço Whatsmeow para gerar QR code
        const whatsmeowUrl = process.env.WHATSMEOW_API || 'http://localhost:4000';
        const response = yield fetch(`${whatsmeowUrl}/api/whatsapp/connect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ company_id: companyId, user_id: userId }),
        });
        if (!response.ok) {
            throw new Error(`Whatsmeow API error: ${response.statusText}`);
        }
        const data = yield response.json();
        // Registrar a tentativa de conexão no banco de dados (opcional)
        console.log(`[WHATSAPP] QR Connection initiated for company: ${companyId}, connection_id: ${data.connection_id}`);
        res.json(data);
    }
    catch (error) {
        console.error('[WHATSAPP] Connect error:', error);
        res.status(500).json({ error: 'Falha ao iniciar conexão com WhatsApp' });
    }
}));
/**
 * GET /whatsapp/qr
 * Verifica o status de uma conexão e retorna o QR code se necessário
 * Query: connection_id (obrigatório)
 */
router.get('/qr', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { connection_id } = req.query;
        if (!connection_id) {
            return res.status(400).json({ error: 'connection_id é obrigatório' });
        }
        // Chamar serviço Whatsmeow para obter status
        const whatsmeowUrl = process.env.WHATSMEOW_API || 'http://localhost:4000';
        const response = yield fetch(`${whatsmeowUrl}/api/whatsapp/qr?connection_id=${connection_id}`);
        if (!response.ok) {
            if (response.status === 404) {
                return res.status(404).json({ error: 'Conexão não encontrada' });
            }
            throw new Error(`Whatsmeow API error: ${response.statusText}`);
        }
        const data = yield response.json();
        res.json(data);
    }
    catch (error) {
        console.error('[WHATSAPP] QR error:', error);
        res.status(500).json({ error: 'Falha ao obter status da conexão' });
    }
}));
exports.default = router;
