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
exports.getConversationContext = getConversationContext;
exports.createConversationSuggestion = createConversationSuggestion;
exports.approveSuggestion = approveSuggestion;
exports.rejectSuggestion = rejectSuggestion;
exports.getPendingSuggestions = getPendingSuggestions;
exports.getAutoRespondStatus = getAutoRespondStatus;
exports.setAutoRespondEnabled = setAutoRespondEnabled;
const models_1 = __importDefault(require("../../models"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const AUTO_RESPOND_CONFIDENCE_THRESHOLD = 0.70;
function getConversationContext(userId_1, companyId_1, clientRef_1) {
    return __awaiter(this, arguments, void 0, function* (userId, companyId, clientRef, limit = 10) {
        // Buscar últimas N mensagens (received + sent) para contexto
        const messages = yield models_1.default.AiConversationMessage.findAll({
            where: {
                user_id: userId,
                company_id: companyId,
                client_ref: clientRef,
            },
            order: [['created_at', 'DESC']],
            limit,
        });
        // Ordenar cronologicamente para contexto
        const orderedMessages = messages.reverse();
        // Gerar resumo do contexto
        const messageTexts = orderedMessages.map((m) => `[${m.direction.toUpperCase()}]: ${m.message_text}`);
        const summary = messageTexts.length > 0
            ? messageTexts.join('\n')
            : 'Nenhuma mensagem anterior';
        return { messages: orderedMessages, summary };
    });
}
/**
 * Envia resposta automática via WhatsApp
 */
function sendAutoRespond(connectionId, clientJid, message) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const base = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:4000';
            const response = yield (0, node_fetch_1.default)(`${base}/whatsapp/connections/${connectionId}/send-message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jid: clientJid, message }),
            });
            if (response.ok) {
                console.log(`[AI] Auto-responded to ${clientJid}`);
                return true;
            }
            console.error(`[AI] Failed to auto-respond: ${response.status}`);
            return false;
        }
        catch (error) {
            console.error('[AI] Error sending auto-respond:', error);
            return false;
        }
    });
}
function createConversationSuggestion(input) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { userId, companyId, connectionId, clientRef, incomingMessage } = input;
        // Garantir isolamento por company_id - apenas verificar se o usuário pertence à empresa
        const user = yield models_1.default.User.findByPk(userId);
        const userCompanies = yield user.getCompanies();
        if (!(userCompanies === null || userCompanies === void 0 ? void 0 : userCompanies.some((c) => c.id === companyId))) {
            throw new Error('Unauthorized access to this company');
        }
        // Buscar contexto da conversa
        const context = yield getConversationContext(userId, companyId, clientRef || 'unknown');
        // Gerar sugestão via IA local
        let suggestedResponse = '';
        let confidence = 0.5;
        try {
            const aiPayload = {
                emails: [
                    {
                        subject: 'Cliente',
                        body: `Contexto:\n${context.summary}\n\nNova mensagem: ${incomingMessage}`,
                    },
                ],
            };
            const aiRes = yield (0, node_fetch_1.default)('http://localhost:5000/summaries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(aiPayload),
            });
            if (aiRes.ok) {
                const data = (yield aiRes.json());
                const result = (_a = data.results) === null || _a === void 0 ? void 0 : _a[0];
                if (result) {
                    const intent = result.category || 'unknown';
                    suggestedResponse = `Entendi que você quer algo sobre ${intent}. Vou verificar e respondo em breve.`;
                    confidence = 0.6;
                    // Registrar mensagem recebida
                    yield models_1.default.AiConversationMessage.create({
                        company_id: companyId,
                        user_id: userId,
                        connection_id: connectionId,
                        client_ref: clientRef,
                        direction: 'received',
                        message_text: incomingMessage,
                        metadata: { intent },
                    });
                }
            }
        }
        catch (err) {
            console.error('[AI] IA generation failed', err);
            suggestedResponse =
                'Obrigado pela mensagem. Vou verificar e respondo em breve.';
            confidence = 0.4;
        }
        const suggestion = yield models_1.default.AiConversationSuggestion.create({
            company_id: companyId,
            user_id: userId,
            connection_id: connectionId,
            client_ref: clientRef,
            incoming_message: incomingMessage,
            suggested_response: suggestedResponse,
            confidence,
        });
        // Verificar se auto-respond está ativado e confiança > threshold
        if ((user === null || user === void 0 ? void 0 : user.ai_auto_respond_enabled) &&
            confidence >= AUTO_RESPOND_CONFIDENCE_THRESHOLD) {
            console.log(`[AI] Auto-respond ativado para ${userId}, confiança: ${confidence}`);
            // Registrar mensagem como auto-enviada
            yield models_1.default.AiConversationMessage.create({
                company_id: companyId,
                user_id: userId,
                connection_id: connectionId,
                client_ref: clientRef,
                direction: 'sent',
                message_text: suggestedResponse,
                metadata: { auto_sent: true, suggestion_id: suggestion.id },
            });
            // Marcar sugestão como auto-enviada
            suggestion.status = 'auto_sent';
            suggestion.approved_response = suggestedResponse;
            yield suggestion.save();
            // Tentar enviar via WhatsApp
            try {
                const sent = yield sendAutoRespond(String(connectionId || ''), clientRef || '', suggestedResponse);
                if (sent) {
                    console.log(`[AI] Auto-respond enviado com sucesso`);
                }
            }
            catch (error) {
                console.error('[AI] Erro ao enviar auto-respond:', error);
            }
        }
        return suggestion;
    });
}
function approveSuggestion(suggestionId, userId, companyId, approvedResponse) {
    return __awaiter(this, void 0, void 0, function* () {
        const suggestion = yield models_1.default.AiConversationSuggestion.findByPk(suggestionId);
        if (!suggestion ||
            suggestion.user_id !== userId ||
            suggestion.company_id !== companyId) {
            throw new Error('Suggestion not found or unauthorized');
        }
        suggestion.status = 'approved';
        suggestion.approved_response =
            approvedResponse || suggestion.suggested_response;
        yield suggestion.save();
        // Registrar mensagem enviada
        yield models_1.default.AiConversationMessage.create({
            company_id: companyId,
            user_id: userId,
            connection_id: suggestion.connection_id,
            client_ref: suggestion.client_ref,
            direction: 'sent',
            message_text: suggestion.approved_response,
            metadata: { from_suggestion: suggestionId },
        });
        // Aumentar score de confiança
        const user = yield models_1.default.User.findByPk(userId);
        if (user) {
            const totalApprovals = (user.ai_total_approvals || 0) + 1;
            const newConfidence = Math.min(0.95, 0.5 + (totalApprovals * 0.05) / 100);
            user.ai_total_approvals = totalApprovals;
            user.ai_confidence_score = newConfidence;
            yield user.save();
        }
        return suggestion;
    });
}
function rejectSuggestion(suggestionId, userId, companyId, feedback) {
    return __awaiter(this, void 0, void 0, function* () {
        const suggestion = yield models_1.default.AiConversationSuggestion.findByPk(suggestionId);
        if (!suggestion ||
            suggestion.user_id !== userId ||
            suggestion.company_id !== companyId) {
            throw new Error('Suggestion not found or unauthorized');
        }
        suggestion.status = 'rejected';
        suggestion.feedback = feedback;
        yield suggestion.save();
        return suggestion;
    });
}
function getPendingSuggestions(userId_1, companyId_1) {
    return __awaiter(this, arguments, void 0, function* (userId, companyId, limit = 20) {
        const suggestions = yield models_1.default.AiConversationSuggestion.findAll({
            where: {
                user_id: userId,
                company_id: companyId,
                status: 'pending',
            },
            order: [['created_at', 'DESC']],
            limit,
            include: [
                {
                    model: models_1.default.UserConnection,
                    as: 'connection',
                    required: false,
                },
            ],
        });
        return suggestions;
    });
}
function getAutoRespondStatus(userId, companyId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const user = yield models_1.default.User.findByPk(userId, {
            include: [
                {
                    model: models_1.default.Company,
                    through: { attributes: [] },
                },
            ],
        });
        if (!user || !((_a = user.Companies) === null || _a === void 0 ? void 0 : _a.some((c) => c.id === companyId))) {
            throw new Error('Unauthorized');
        }
        return {
            auto_respond_enabled: user.ai_auto_respond_enabled || false,
            confidence_score: user.ai_confidence_score || 0,
            total_approvals: user.ai_total_approvals || 0,
        };
    });
}
function setAutoRespondEnabled(userId, companyId, enabled) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const user = yield models_1.default.User.findByPk(userId, {
            include: [
                {
                    model: models_1.default.Company,
                    through: { attributes: [] },
                },
            ],
        });
        if (!user || !((_a = user.Companies) === null || _a === void 0 ? void 0 : _a.some((c) => c.id === companyId))) {
            throw new Error('Unauthorized');
        }
        user.ai_auto_respond_enabled = enabled;
        yield user.save();
        return {
            auto_respond_enabled: enabled,
            confidence_score: user.ai_confidence_score,
        };
    });
}
