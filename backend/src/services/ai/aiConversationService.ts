import models from '../../models';
import { Op } from 'sequelize';
import fetch from 'node-fetch';

const AUTO_RESPOND_CONFIDENCE_THRESHOLD = 0.70;

export interface CreateSuggestionInput {
  userId: string;
  companyId: string;
  connectionId?: number;
  clientRef?: string;
  incomingMessage: string;
}

export interface ConversationContext {
  messages: any[];
  summary: string;
}

export async function getConversationContext(
  userId: string,
  companyId: string,
  clientRef: string,
  limit = 10
): Promise<ConversationContext> {
  // Buscar últimas N mensagens (received + sent) para contexto
  const messages = await (models as any).AiConversationMessage.findAll({
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
  const messageTexts = orderedMessages.map(
    (m: any) => `[${m.direction.toUpperCase()}]: ${m.message_text}`
  );

  const summary =
    messageTexts.length > 0
      ? messageTexts.join('\n')
      : 'Nenhuma mensagem anterior';

  return { messages: orderedMessages, summary };
}

/**
 * Envia resposta automática via WhatsApp
 */
async function sendAutoRespond(
  connectionId: string,
  clientJid: string,
  message: string
): Promise<boolean> {
  try {
    const base = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:4000';
    const response = await fetch(
      `${base}/whatsapp/connections/${connectionId}/send-message`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jid: clientJid, message }),
      }
    );
    if (response.ok) {
      console.log(`[AI] Auto-responded to ${clientJid}`);
      return true;
    }
    console.error(`[AI] Failed to auto-respond: ${response.status}`);
    return false;
  } catch (error) {
    console.error('[AI] Error sending auto-respond:', error);
    return false;
  }
}

export async function createConversationSuggestion(input: CreateSuggestionInput) {
  const { userId, companyId, connectionId, clientRef, incomingMessage } = input;

  // Garantir isolamento por company_id - apenas verificar se o usuário pertence à empresa
  const user = await (models as any).User.findByPk(userId);
  const userCompanies = await user.getCompanies();
  
  if (!userCompanies?.some((c: any) => c.id === companyId)) {
    throw new Error('Unauthorized access to this company');
  }

  // Buscar contexto da conversa
  const context = await getConversationContext(
    userId,
    companyId,
    clientRef || 'unknown'
  );

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

    const aiRes = await fetch('http://localhost:5000/summaries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(aiPayload),
    });

    if (aiRes.ok) {
      const data = (await aiRes.json()) as any;
      const result = data.results?.[0];
      if (result) {
        const intent = result.category || 'unknown';
        suggestedResponse = `Entendi que você quer algo sobre ${intent}. Vou verificar e respondo em breve.`;
        confidence = 0.6;

        // Registrar mensagem recebida
        await (models as any).AiConversationMessage.create({
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
  } catch (err) {
    console.error('[AI] IA generation failed', err);
    suggestedResponse =
      'Obrigado pela mensagem. Vou verificar e respondo em breve.';
    confidence = 0.4;
  }

  const suggestion = await (models as any).AiConversationSuggestion.create({
    company_id: companyId,
    user_id: userId,
    connection_id: connectionId,
    client_ref: clientRef,
    incoming_message: incomingMessage,
    suggested_response: suggestedResponse,
    confidence,
  });

  // Verificar se auto-respond está ativado e confiança > threshold
  if (
    (user as any)?.ai_auto_respond_enabled &&
    confidence >= AUTO_RESPOND_CONFIDENCE_THRESHOLD
  ) {
    console.log(
      `[AI] Auto-respond ativado para ${userId}, confiança: ${confidence}`
    );

    // Registrar mensagem como auto-enviada
    await (models as any).AiConversationMessage.create({
      company_id: companyId,
      user_id: userId,
      connection_id: connectionId,
      client_ref: clientRef,
      direction: 'sent',
      message_text: suggestedResponse,
      metadata: { auto_sent: true, suggestion_id: (suggestion as any).id },
    });

    // Marcar sugestão como auto-enviada
    (suggestion as any).status = 'auto_sent';
    (suggestion as any).approved_response = suggestedResponse;
    await (suggestion as any).save();

    // Tentar enviar via WhatsApp
    try {
      const sent = await sendAutoRespond(String(connectionId || ''), clientRef || '', suggestedResponse);
      if (sent) {
        console.log(`[AI] Auto-respond enviado com sucesso`);
      }
    } catch (error) {
      console.error('[AI] Erro ao enviar auto-respond:', error);
    }
  }

  return suggestion;
}

export async function approveSuggestion(
  suggestionId: string,
  userId: string,
  companyId: string,
  approvedResponse?: string
) {
  const suggestion = await (models as any).AiConversationSuggestion.findByPk(
    suggestionId
  );

  if (
    !suggestion ||
    (suggestion as any).user_id !== userId ||
    (suggestion as any).company_id !== companyId
  ) {
    throw new Error('Suggestion not found or unauthorized');
  }

  (suggestion as any).status = 'approved';
  (suggestion as any).approved_response =
    approvedResponse || (suggestion as any).suggested_response;
  await (suggestion as any).save();

  // Registrar mensagem enviada
  await (models as any).AiConversationMessage.create({
    company_id: companyId,
    user_id: userId,
    connection_id: (suggestion as any).connection_id,
    client_ref: (suggestion as any).client_ref,
    direction: 'sent',
    message_text: (suggestion as any).approved_response,
    metadata: { from_suggestion: suggestionId },
  });

  // Aumentar score de confiança
  const user = await (models as any).User.findByPk(userId);
  if (user) {
    const totalApprovals = ((user as any).ai_total_approvals || 0) + 1;
    const newConfidence = Math.min(0.95, 0.5 + (totalApprovals * 0.05) / 100);

    (user as any).ai_total_approvals = totalApprovals;
    (user as any).ai_confidence_score = newConfidence;
    await (user as any).save();
  }

  return suggestion;
}

export async function rejectSuggestion(
  suggestionId: string,
  userId: string,
  companyId: string,
  feedback?: string
) {
  const suggestion = await (models as any).AiConversationSuggestion.findByPk(
    suggestionId
  );

  if (
    !suggestion ||
    (suggestion as any).user_id !== userId ||
    (suggestion as any).company_id !== companyId
  ) {
    throw new Error('Suggestion not found or unauthorized');
  }

  (suggestion as any).status = 'rejected';
  (suggestion as any).feedback = feedback;
  await (suggestion as any).save();

  return suggestion;
}

export async function getPendingSuggestions(
  userId: string,
  companyId: string,
  limit = 20
) {
  const suggestions = await (models as any).AiConversationSuggestion.findAll({
    where: {
      user_id: userId,
      company_id: companyId,
      status: 'pending',
    },
    order: [['created_at', 'DESC']],
    limit,
    include: [
      {
        model: (models as any).UserConnection,
        as: 'connection',
        required: false,
      },
    ],
  });

  return suggestions;
}

export async function getAutoRespondStatus(userId: string, companyId: string) {
  const user = await (models as any).User.findByPk(userId, {
    include: [
      {
        model: (models as any).Company,
        through: { attributes: [] },
      },
    ],
  });

  if (!user || !(user as any).Companies?.some((c: any) => c.id === companyId)) {
    throw new Error('Unauthorized');
  }

  return {
    auto_respond_enabled: (user as any).ai_auto_respond_enabled || false,
    confidence_score: (user as any).ai_confidence_score || 0,
    total_approvals: (user as any).ai_total_approvals || 0,
  };
}

export async function setAutoRespondEnabled(
  userId: string,
  companyId: string,
  enabled: boolean
) {
  const user = await (models as any).User.findByPk(userId, {
    include: [
      {
        model: (models as any).Company,
        through: { attributes: [] },
      },
    ],
  });

  if (!user || !(user as any).Companies?.some((c: any) => c.id === companyId)) {
    throw new Error('Unauthorized');
  }

  (user as any).ai_auto_respond_enabled = enabled;
  await (user as any).save();

  return {
    auto_respond_enabled: enabled,
    confidence_score: (user as any).ai_confidence_score,
  };
}

