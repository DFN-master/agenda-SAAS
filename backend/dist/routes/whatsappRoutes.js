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
        const normalizedConnectionId = Number.isFinite(Number(connection_id))
            ? Number(connection_id)
            : undefined;
        if (!message_text) {
            return res.status(400).json({ error: 'message_text é obrigatório' });
        }
        const suggestion = yield (0, aiConversationService_1.createConversationSuggestion)({
            userId,
            companyId,
            connectionId: normalizedConnectionId,
            clientRef: jid || client_ref,
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
exports.default = router;
