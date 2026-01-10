import models from '../../models';
import { Op } from 'sequelize';
import fetch from 'node-fetch';

const AUTO_RESPOND_CONFIDENCE_THRESHOLD = 0.70;

export interface CreateSuggestionInput {
  userId: string;
  companyId: string;
  connectionId?: number;
  connectionIdString?: string; // ID string do whatsapp-service (conn_*)
  clientRef?: string;
  clientJid?: string; // JID original (pode ser LID ou JID normal)
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
  connectionIdOrDbId: number | string,
  clientJid: string,
  message: string
): Promise<boolean> {
  try {
    // Se é um número (ID do banco), usa o formato conn_ID
    let connectionIdStr: string;
    
    if (typeof connectionIdOrDbId === 'number') {
      // Usar diretamente o ID no formato esperado pelo whatsapp-service
      // Como o whatsapp-service cria conexões com formato "conn_timestamp",
      // vamos precisar buscar isso de outra forma ou passar o ID numérico
      console.log(`[AI] Trying to send via connection DB ID: ${connectionIdOrDbId}`);
      
      // Por enquanto, vamos tentar passar direto para o endpoint
      // O whatsapp-service precisa aceitar IDs numéricos ou ter mapeamento
      connectionIdStr = `conn_${connectionIdOrDbId}`;
    } else {
      connectionIdStr = connectionIdOrDbId;
    }
    
    const base = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:4000';
    const response = await fetch(
      `${base}/whatsapp/connections/${connectionIdStr}/send-message`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jid: clientJid, message }),
      }
    );
    if (response.ok) {
      console.log(`[AI] Auto-responded to ${clientJid} via connection ${connectionIdStr}`);
      return true;
    }
    console.error(`[AI] Failed to auto-respond via ${connectionIdStr}: ${response.status}`);
    return false;
  } catch (error) {
    console.error('[AI] Error sending auto-respond:', error);
    return false;
  }
}

function detectIntent(message: string) {
  const lower = message.toLowerCase();
  if (/(preço|valor|custo|plano)/.test(lower)) return 'preço';
  if (/(agendar|marcar|agenda|horário)/.test(lower)) return 'agendamento';
  if (/(suporte|problema|erro|ajuda)/.test(lower)) return 'suporte';
  if (/(cancelar|cancelamento)/.test(lower)) return 'cancelamento';
  if (/(endereço|localização|onde)/.test(lower)) return 'localização';
  return 'geral';
}

function buildSuggestedResponse(intent: string, incoming: string, summary: string) {
  const trimmed = incoming.trim().slice(0, 140);
  const base =
    summary && summary !== 'Nenhuma mensagem anterior'
      ? `Contexto rápido: ${summary.split('\n').slice(-3).join(' | ')}`
      : 'Sem histórico prévio.';

  const templates: Record<string, string[]> = {
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

function mergeSuggestionMetadata(existing: any, patch: any) {
  // Preserva metadados anteriores e acrescenta decisão/feedback
  const base = existing && typeof existing === 'object' ? existing : {};
  return { ...base, ...patch };
}

export async function createConversationSuggestion(input: CreateSuggestionInput) {
  const { userId, companyId, connectionId, connectionIdString, clientRef, clientJid, incomingMessage } = input;

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

    const cognitiveRes = await fetch('http://localhost:5001/cognitive-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cognitivePayload),
    });

    if (cognitiveRes.ok) {
      const data = (await cognitiveRes.json()) as any;
      suggestedResponse = data.suggested_response || buildSuggestedResponse(intent, incomingMessage, context.summary);
      suggestedResponse = data.suggested_response || buildSuggestedResponse(intent, incomingMessage, context.summary);
      confidence = data.confidence || 0.6;

      // Registrar mensagem recebida
      await (models as any).AiConversationMessage.create({
        company_id: companyId,
        user_id: userId,
        connection_id: connectionId,
        client_ref: clientRef,
        direction: 'received',
        message_text: incomingMessage,
        metadata: { intent, knowledge_used: data.knowledge_used || [] },
      });
    } else {
      // Fallback se cognitive engine falhar
      suggestedResponse = buildSuggestedResponse(intent, incomingMessage, context.summary);
      confidence = 0.5;
    }
  } catch (err) {
    console.error('[AI] IA generation failed', err);
    suggestedResponse = buildSuggestedResponse(intent, incomingMessage, context.summary);
    confidence = 0.45;
  }

  const suggestion = await (models as any).AiConversationSuggestion.create({
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
      // Usar clientJid (LID/JID original) se disponível, senão usar clientRef (telefone)
      const targetJid = clientJid || clientRef || '';
      // Usar connectionIdString se disponível, senão tenta com connectionId numérico
      const connId = connectionIdString || connectionId || 0;
      const sent = await sendAutoRespond(connId, targetJid, suggestedResponse);
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
  (suggestion as any).metadata = mergeSuggestionMetadata(
    (suggestion as any).metadata,
    {
      last_decision: {
        type: 'approved',
        at: new Date().toISOString(),
        approved_response:
          approvedResponse || (suggestion as any).suggested_response,
      },
    }
  );
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
  (suggestion as any).metadata = mergeSuggestionMetadata(
    (suggestion as any).metadata,
    {
      last_decision: {
        type: 'rejected',
        at: new Date().toISOString(),
        feedback,
      },
    }
  );
  await (suggestion as any).save();

  return suggestion;
}

export async function getPendingSuggestions(
  userId: string,
  companyId: string,
  limit = 20
) {
  const suggestions = await ((models as any).AiConversationSuggestion as any)
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
}

export async function updateSuggestionDecision(
  suggestionId: string,
  userId: string,
  companyId: string,
  data: { status: 'approved' | 'rejected'; approved_response?: string; feedback?: string }
) {
  const suggestion = await ((models as any).AiConversationSuggestion as any)
    .unscoped()
    .findOne({
      where: { id: suggestionId, user_id: userId, company_id: companyId },
    });

  if (!suggestion) {
    throw new Error('Suggestion not found or unauthorized');
  }

  const { status, approved_response, feedback } = data;
  (suggestion as any).status = status;

  if (status === 'approved') {
    (suggestion as any).approved_response =
      approved_response || (suggestion as any).approved_response || (suggestion as any).suggested_response;
    (suggestion as any).feedback = null;
  } else if (status === 'rejected') {
    (suggestion as any).feedback = feedback || null;
    (suggestion as any).approved_response = null;
  }

  (suggestion as any).metadata = mergeSuggestionMetadata(
    (suggestion as any).metadata,
    {
      last_decision: {
        type: status,
        at: new Date().toISOString(),
        approved_response:
          status === 'approved'
            ? (suggestion as any).approved_response
            : undefined,
        feedback: status === 'rejected' ? feedback : undefined,
      },
    }
  );

  await (suggestion as any).save();
  return suggestion;
}

export async function getDecidedSuggestions(
  userId: string,
  companyId: string,
  status: 'approved' | 'rejected' | 'auto_sent' | 'pending' = 'approved',
  limit = 50
) {
  const suggestions = await ((models as any).AiConversationSuggestion as any)
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

