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
exports.updateSuggestionDecision = updateSuggestionDecision;
exports.getDecidedSuggestions = getDecidedSuggestions;
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
function sendAutoRespond(connectionIdOrDbId, clientJid, message) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Se é um número (ID do banco), precisa buscar o connectionId string (conn_*)
            let connectionIdStr;
            if (typeof connectionIdOrDbId === 'number') {
                // Buscar a conexão real no user_connections
                const connection = yield models_1.default.UserConnection.findOne({
                    where: { id: connectionIdOrDbId, status: 'active' }
                });
                if (!connection || !connection.connection_id) {
                    console.error(`[AI] Connection ID ${connectionIdOrDbId} not found in database or not active`);
                    return false;
                }
                connectionIdStr = String(connection.connection_id);
            }
            else {
                connectionIdStr = connectionIdOrDbId;
            }
            const base = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:4000';
            const response = yield (0, node_fetch_1.default)(`${base}/whatsapp/connections/${connectionIdStr}/send-message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jid: clientJid, message }),
            });
            if (response.ok) {
                console.log(`[AI] Auto-responded to ${clientJid} via connection ${connectionIdStr}`);
                return true;
            }
            console.error(`[AI] Failed to auto-respond via ${connectionIdStr}: ${response.status}`);
            return false;
        }
        catch (error) {
            console.error('[AI] Error sending auto-respond:', error);
            return false;
        }
    });
}
function detectIntent(message) {
    const lower = message.toLowerCase();
    if (/(preço|valor|custo|plano)/.test(lower))
        return 'preço';
    if (/(agendar|marcar|agenda|horário)/.test(lower))
        return 'agendamento';
    if (/(suporte|problema|erro|ajuda)/.test(lower))
        return 'suporte';
    if (/(cancelar|cancelamento)/.test(lower))
        return 'cancelamento';
    if (/(endereço|localização|onde)/.test(lower))
        return 'localização';
    return 'geral';
}
function buildSuggestedResponse(intent, incoming, summary) {
    const trimmed = incoming.trim().slice(0, 140);
    const base = summary && summary !== 'Nenhuma mensagem anterior'
        ? `Contexto rápido: ${summary.split('\n').slice(-3).join(' | ')}`
        : 'Sem histórico prévio.';
    const templates = {
        preço: [
            `Recebi sua dúvida sobre planos/preços. Vou confirmar a melhor opção e já retorno com valores atualizados. (${base})`,
            `Entendi que você quer detalhes de preço. Vou levantar os valores e te respondo na sequência. (${base})`,
        ],
        agendamento: [
            `Posso ajudar com o agendamento. Qual é o melhor dia/horário? Vou verificar disponibilidade e confirmo. (${base})`,
            `Vamos marcar? Me diga sua preferência e já tento encaixar. (${base})`,
        ],
        suporte: [
            `Vou te ajudar com esse problema. Me dá um minuto para revisar e volto com a solução. (${base})`,
            `Entendi o erro relatado. Vou checar os detalhes e retorno com um passo a passo. (${base})`,
        ],
        cancelamento: [
            `Posso cuidar do cancelamento. Só confirmando a solicitação: "${trimmed}". Vou processar e aviso quando concluir. (${base})`,
            `Registro seu pedido de cancelamento e retorno já com a confirmação. (${base})`,
        ],
        localização: [
            `Quer nosso endereço/localização. Vou enviar o link e orientações em seguida. (${base})`,
            `Já pego o endereço certinho e compartilho com você. (${base})`,
        ],
        geral: [
            `Recebi sua mensagem: "${trimmed}". Vou analisar e te respondo em instantes. (${base})`,
            `Obrigado pelo contato! Vou verificar o que você precisa e retorno já. (${base})`,
        ],
    };
    const options = templates[intent] || templates.geral;
    const choice = Math.floor(Math.random() * options.length);
    return options[choice];
}
function mergeSuggestionMetadata(existing, patch) {
    // Preserva metadados anteriores e acrescenta decisão/feedback
    const base = existing && typeof existing === 'object' ? existing : {};
    return Object.assign(Object.assign({}, base), patch);
}
function createConversationSuggestion(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const { userId, companyId, connectionId, clientRef, incomingMessage } = input;
        // Garantir isolamento por company_id - apenas verificar se o usuário pertence à empresa
        const user = yield models_1.default.User.findByPk(userId);
        const userCompanies = yield user.getCompanies();
        if (!(userCompanies === null || userCompanies === void 0 ? void 0 : userCompanies.some((c) => c.id === companyId))) {
            throw new Error('Unauthorized access to this company');
        }
        // Buscar contexto da conversa
        const context = yield getConversationContext(userId, companyId, clientRef || 'unknown');
        // Gerar sugestão via heurística local
        let suggestedResponse = '';
        let confidence = 0.5;
        const intent = detectIntent(incomingMessage || '');
        try {
            // Chama motor cognitivo em Python (cognitive_engine.py na porta 5001)
            const cognitivePayload = {
                incoming_message: incomingMessage,
                context_summary: context.summary,
                intent,
                company_id: companyId,
            };
            const cognitiveRes = yield (0, node_fetch_1.default)('http://localhost:5001/cognitive-response', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cognitivePayload),
            });
            if (cognitiveRes.ok) {
                const data = (yield cognitiveRes.json());
                suggestedResponse = data.suggested_response || buildSuggestedResponse(intent, incomingMessage, context.summary);
                suggestedResponse = data.suggested_response || buildSuggestedResponse(intent, incomingMessage, context.summary);
                confidence = data.confidence || 0.6;
                // Registrar mensagem recebida
                yield models_1.default.AiConversationMessage.create({
                    company_id: companyId,
                    user_id: userId,
                    connection_id: connectionId,
                    client_ref: clientRef,
                    direction: 'received',
                    message_text: incomingMessage,
                    metadata: { intent, knowledge_used: data.knowledge_used || [] },
                });
            }
            else {
                // Fallback se cognitive engine falhar
                suggestedResponse = buildSuggestedResponse(intent, incomingMessage, context.summary);
                confidence = 0.5;
            }
        }
        catch (err) {
            console.error('[AI] IA generation failed', err);
            suggestedResponse = buildSuggestedResponse(intent, incomingMessage, context.summary);
            confidence = 0.45;
        }
        const suggestion = yield models_1.default.AiConversationSuggestion.create({
            company_id: companyId,
            user_id: userId,
            connection_id: connectionId,
            client_ref: clientRef,
            incoming_message: incomingMessage,
            suggested_response: suggestedResponse,
            confidence,
            metadata: { intent },
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
                // Passar connectionId (number do banco) - sendAutoRespond irá buscar o conn_* correto
                const sent = yield sendAutoRespond(connectionId || 0, clientRef || '', suggestedResponse);
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
        suggestion.metadata = mergeSuggestionMetadata(suggestion.metadata, {
            last_decision: {
                type: 'approved',
                at: new Date().toISOString(),
                approved_response: approvedResponse || suggestion.suggested_response,
            },
        });
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
        suggestion.metadata = mergeSuggestionMetadata(suggestion.metadata, {
            last_decision: {
                type: 'rejected',
                at: new Date().toISOString(),
                feedback,
            },
        });
        yield suggestion.save();
        return suggestion;
    });
}
function getPendingSuggestions(userId_1, companyId_1) {
    return __awaiter(this, arguments, void 0, function* (userId, companyId, limit = 20) {
        const suggestions = yield models_1.default.AiConversationSuggestion
            .unscoped()
            .findAll({
            where: {
                user_id: userId,
                company_id: companyId,
                status: 'pending',
            },
            include: [],
            order: [['created_at', 'DESC']],
            limit,
        });
        return suggestions;
    });
}
function updateSuggestionDecision(suggestionId, userId, companyId, data) {
    return __awaiter(this, void 0, void 0, function* () {
        const suggestion = yield models_1.default.AiConversationSuggestion
            .unscoped()
            .findOne({
            where: { id: suggestionId, user_id: userId, company_id: companyId },
        });
        if (!suggestion) {
            throw new Error('Suggestion not found or unauthorized');
        }
        const { status, approved_response, feedback } = data;
        suggestion.status = status;
        if (status === 'approved') {
            suggestion.approved_response =
                approved_response || suggestion.approved_response || suggestion.suggested_response;
            suggestion.feedback = null;
        }
        else if (status === 'rejected') {
            suggestion.feedback = feedback || null;
            suggestion.approved_response = null;
        }
        suggestion.metadata = mergeSuggestionMetadata(suggestion.metadata, {
            last_decision: {
                type: status,
                at: new Date().toISOString(),
                approved_response: status === 'approved'
                    ? suggestion.approved_response
                    : undefined,
                feedback: status === 'rejected' ? feedback : undefined,
            },
        });
        yield suggestion.save();
        return suggestion;
    });
}
function getDecidedSuggestions(userId_1, companyId_1) {
    return __awaiter(this, arguments, void 0, function* (userId, companyId, status = 'approved', limit = 50) {
        const suggestions = yield models_1.default.AiConversationSuggestion
            .unscoped()
            .findAll({
            where: {
                user_id: userId,
                company_id: companyId,
                status,
            },
            include: [],
            order: [['updated_at', 'DESC']],
            limit,
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
