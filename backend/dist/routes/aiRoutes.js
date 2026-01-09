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
const aiEventService_1 = require("../services/ai/aiEventService");
const aiConversationService_1 = require("../services/ai/aiConversationService");
const learningService_1 = require("../services/ai/learningService");
const models_1 = __importDefault(require("../models"));
const router = express_1.default.Router();
// Middleware para verificar company_id e user_id
const getCompanyId = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = req.userId;
    const companyId = req.query.company_id || req.body.company_id;
    if (!companyId) {
        return res.status(400).json({ error: 'company_id é obrigatório' });
    }
    // Verificar se usuário pertence à empresa
    const user = yield models_1.default.User.findByPk(userId, {
        include: [
            {
                model: models_1.default.Company,
                through: { attributes: [] },
            },
        ],
    });
    if (!user || !((_a = user.Companies) === null || _a === void 0 ? void 0 : _a.some((c) => c.id === companyId))) {
        return res.status(403).json({ error: 'Unauthorized company access' });
    }
    req.companyId = companyId;
    next();
});
// Criar evento cognitivo (email, whatsapp, agenda, manual)
router.post('/events', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { source, client_ref, subject, summary, intent, occurrence_count, metadata, occurred_at, } = req.body;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!source) {
            return res.status(400).json({ error: 'source é obrigatório' });
        }
        const event = yield (0, aiEventService_1.createAiEvent)({
            userId,
            source,
            clientRef: client_ref,
            subject,
            summary,
            intent,
            occurrenceCount: occurrence_count,
            metadata,
            occurredAt: occurred_at,
        });
        res.status(201).json({ data: event });
    }
    catch (error) {
        console.error('Error creating AI event:', error);
        res.status(500).json({ error: 'Failed to create AI event' });
    }
}));
// Obter contexto/memória cognitiva
router.get('/context', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { client_ref, source, window_days, limit } = req.query;
        const context = yield (0, aiEventService_1.getAiContext)({
            userId,
            clientRef: client_ref,
            source: source,
            windowDays: window_days ? parseInt(window_days, 10) : 30,
            limit: limit ? parseInt(limit, 10) : 50,
        });
        res.json({ data: context });
    }
    catch (error) {
        console.error('Error fetching AI context:', error);
        res.status(500).json({ error: 'Failed to fetch AI context' });
    }
}));
// Criar sugestão de resposta para mensagem (webhook)
router.post('/suggestions', getCompanyId, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const companyId = req.companyId;
        const { connection_id, client_ref, incoming_message } = req.body;
        if (!incoming_message) {
            return res.status(400).json({ error: 'incoming_message é obrigatório' });
        }
        const suggestion = yield (0, aiConversationService_1.createConversationSuggestion)({
            userId,
            companyId,
            connectionId: connection_id,
            clientRef: client_ref,
            incomingMessage: incoming_message,
        });
        res.status(201).json({ data: suggestion });
    }
    catch (error) {
        console.error('Error creating suggestion:', error);
        res.status(500).json({ error: 'Failed to create suggestion' });
    }
}));
// Listar sugestões pendentes
router.get('/suggestions', getCompanyId, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const companyId = req.companyId;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
        const suggestions = yield (0, aiConversationService_1.getPendingSuggestions)(userId, companyId, limit);
        res.json({ data: suggestions });
    }
    catch (error) {
        console.error('Error fetching suggestions:', error);
        res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
}));
// Histórico de sugestões aprovadas/rejeitadas
router.get('/suggestions/history', getCompanyId, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const companyId = req.companyId;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
        const status = req.query.status || 'approved';
        const allowed = ['approved', 'rejected', 'auto_sent', 'pending'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ error: 'status inválido' });
        }
        const suggestions = yield (0, aiConversationService_1.getDecidedSuggestions)(userId, companyId, status, limit);
        res.json({ data: suggestions });
    }
    catch (error) {
        console.error('Error fetching suggestion history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
}));
// Aprovar sugestão e treinar
router.post('/suggestions/:id/approve', getCompanyId, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const companyId = req.companyId;
        const { id } = req.params;
        const { approved_response } = req.body;
        const suggestion = yield (0, aiConversationService_1.approveSuggestion)(id, userId, companyId, approved_response);
        res.json({ data: suggestion });
    }
    catch (error) {
        console.error('Error approving suggestion:', error);
        res.status(500).json({ error: 'Failed to approve suggestion' });
    }
}));
// Rejeitar sugestão
router.post('/suggestions/:id/reject', getCompanyId, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const companyId = req.companyId;
        const { id } = req.params;
        const { feedback } = req.body;
        const suggestion = yield (0, aiConversationService_1.rejectSuggestion)(id, userId, companyId, feedback);
        res.json({ data: suggestion });
    }
    catch (error) {
        console.error('Error rejecting suggestion:', error);
        res.status(500).json({ error: 'Failed to reject suggestion' });
    }
}));
// Editar decisão de uma sugestão aprovada/rejeitada
router.post('/suggestions/:id/update', getCompanyId, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const companyId = req.companyId;
        const { id } = req.params;
        const { status, approved_response, feedback } = req.body;
        if (!status || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'status deve ser approved ou rejected' });
        }
        const suggestion = yield (0, aiConversationService_1.updateSuggestionDecision)(id, userId, companyId, {
            status,
            approved_response,
            feedback,
        });
        res.json({ data: suggestion });
    }
    catch (error) {
        console.error('Error updating suggestion decision:', error);
        res.status(500).json({ error: 'Failed to update suggestion' });
    }
}));
// Obter status de auto-resposta
router.get('/auto-respond/status', getCompanyId, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const companyId = req.companyId;
        const status = yield (0, aiConversationService_1.getAutoRespondStatus)(userId, companyId);
        res.json({ data: status });
    }
    catch (error) {
        console.error('Error fetching auto-respond status:', error);
        res.status(500).json({ error: 'Failed to fetch status' });
    }
}));
// Ativar/desativar auto-resposta
router.post('/auto-respond', getCompanyId, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const companyId = req.companyId;
        const { enabled } = req.body;
        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ error: 'enabled deve ser boolean' });
        }
        const result = yield (0, aiConversationService_1.setAutoRespondEnabled)(userId, companyId, enabled);
        res.json({ data: result });
    }
    catch (error) {
        console.error('Error setting auto-respond:', error);
        res.status(500).json({ error: 'Failed to set auto-respond' });
    }
}));
// ==================== LEARNING ENDPOINTS ====================
// Ensinar um novo conceito para a IA
router.post('/learning/teach', getCompanyId, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const companyId = req.companyId;
        const { original_query, explanation, intent, examples, keywords } = req.body;
        if (!original_query || !explanation) {
            return res.status(400).json({ error: 'original_query e explanation são obrigatórios' });
        }
        const concept = yield (0, learningService_1.teachConcept)({
            companyId,
            originalQuery: original_query,
            explanation,
            intent,
            examples: examples || [],
            keywords: keywords || [],
            userId,
        });
        res.status(201).json({ data: concept });
    }
    catch (error) {
        console.error('Error teaching concept:', error);
        res.status(500).json({ error: 'Failed to teach concept' });
    }
}));
// Buscar conceitos similares (para detectar duplicatas ou sugerir conceitos existentes)
router.post('/learning/search', getCompanyId, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = req.companyId;
        const { query, limit } = req.body;
        if (!query) {
            return res.status(400).json({ error: 'query é obrigatório' });
        }
        const concepts = yield (0, learningService_1.findSimilarConcepts)(query, companyId, limit || 5);
        res.json({ data: concepts });
    }
    catch (error) {
        console.error('Error searching concepts:', error);
        res.status(500).json({ error: 'Failed to search concepts' });
    }
}));
// Listar todos os conceitos aprendidos
router.get('/learning/concepts', getCompanyId, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = req.companyId;
        const intent = req.query.intent;
        const concepts = yield (0, learningService_1.getLearnedConcepts)(companyId, intent);
        res.json({ data: concepts });
    }
    catch (error) {
        console.error('Error fetching concepts:', error);
        res.status(500).json({ error: 'Failed to fetch concepts' });
    }
}));
// Atualizar um conceito existente
router.put('/learning/concepts/:id', getCompanyId, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = req.companyId;
        const { id } = req.params;
        const { explanation, intent, examples, keywords } = req.body;
        const concept = yield (0, learningService_1.updateConcept)(id, companyId, {
            explanation,
            intent,
            examples,
            keywords,
        });
        res.json({ data: concept });
    }
    catch (error) {
        console.error('Error updating concept:', error);
        res.status(500).json({ error: 'Failed to update concept' });
    }
}));
// Deletar um conceito
router.delete('/learning/concepts/:id', getCompanyId, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = req.companyId;
        const { id } = req.params;
        yield (0, learningService_1.deleteConcept)(id, companyId);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting concept:', error);
        res.status(500).json({ error: 'Failed to delete concept' });
    }
}));
exports.default = router;
