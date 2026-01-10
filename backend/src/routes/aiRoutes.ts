import express, { Request, Response } from 'express';
import { createAiEvent, getAiContext } from '../services/ai/aiEventService';
import {
  createConversationSuggestion,
  approveSuggestion,
  rejectSuggestion,
  getPendingSuggestions,
  getDecidedSuggestions,
  updateSuggestionDecision,
  getAutoRespondStatus,
  setAutoRespondEnabled,
} from '../services/ai/aiConversationService';
import {
  teachConcept,
  findSimilarConcepts,
  getLearnedConcepts,
  deleteConcept,
  updateConcept,
} from '../services/ai/learningService';
import { seedVocabulary, getVocabularyStats } from '../services/ai/vocabularySeeder';
import models from '../models';

const router = express.Router();

// Middleware para verificar company_id e user_id
const getCompanyId = async (req: any, res: Response, next: any) => {
  const userId = req.userId;
  const companyId = String(req.query.company_id || req.body.company_id || '').trim();

  if (!companyId) {
    return res.status(400).json({ error: 'company_id é obrigatório' });
  }

  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (!uuidRegex.test(companyId)) {
    return res.status(400).json({ error: 'company_id deve ser um UUID' });
  }

  // Verificar se usuário pertence à empresa
  const user = await (models as any).User.findByPk(userId, {
    include: [
      {
        model: (models as any).Company,
        through: { attributes: [] },
      },
    ],
  });

  const userCompanies = (user as any)?.Companies || [];
  const belongsToCompany = userCompanies.some((c: any) => String(c.id) === companyId);

  if (!user || !belongsToCompany) {
    return res.status(403).json({ error: 'Unauthorized company access' });
  }

  req.companyId = companyId;
  next();
};

// Criar evento cognitivo (email, whatsapp, agenda, manual)
router.post('/events', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const {
      source,
      client_ref,
      subject,
      summary,
      intent,
      occurrence_count,
      metadata,
      occurred_at,
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!source) {
      return res.status(400).json({ error: 'source é obrigatório' });
    }

    const event = await createAiEvent({
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
  } catch (error) {
    console.error('Error creating AI event:', error);
    res.status(500).json({ error: 'Failed to create AI event' });
  }
});

// Obter contexto/memória cognitiva
router.get('/context', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { client_ref, source, window_days, limit } = req.query;

    const context = await getAiContext({
      userId,
      clientRef: client_ref as string | undefined,
      source: source as any,
      windowDays: window_days ? parseInt(window_days as string, 10) : 30,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });

    res.json({ data: context });
  } catch (error) {
    console.error('Error fetching AI context:', error);
    res.status(500).json({ error: 'Failed to fetch AI context' });
  }
});

// Criar sugestão de resposta para mensagem (webhook)
router.post('/suggestions', getCompanyId, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const companyId = (req as any).companyId;
    const { connection_id, client_ref, jid, incoming_message } = req.body;
    
    console.log('[AI SUGGESTIONS] Received:', { connection_id, jid, client_ref, message: incoming_message?.substring(0, 50) });
    
    // Buscar a conexão ativa do usuário (temporário até adicionar campo connection_id)
    console.log('[AI SUGGESTIONS] Buscando conexão ativa para userId:', userId, 'companyId:', companyId);
    const activeConnection = await (models as any).UserConnection.findOne({
      where: { 
        user_id: userId,
        status: 'active'
      },
      order: [['created_at', 'DESC']]
    });
    
    const normalizedConnectionId = activeConnection ? activeConnection.id : undefined;
    console.log('[AI SUGGESTIONS] Found active connection:', normalizedConnectionId);

    if (!incoming_message) {
      return res.status(400).json({ error: 'incoming_message é obrigatório' });
    }

    const suggestion = await createConversationSuggestion({
      userId,
      companyId,
      connectionId: normalizedConnectionId,
      connectionIdString: connection_id, // ID string original do whatsapp-service
      clientRef: client_ref,
      clientJid: jid, // JID original (LID/JID)
      incomingMessage: incoming_message,
    });

    res.status(201).json({ data: suggestion });
  } catch (error) {
    console.error('Error creating suggestion:', error);
    res.status(500).json({ error: 'Failed to create suggestion' });
  }
});

// Listar sugestões pendentes
router.get('/suggestions', getCompanyId, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const companyId = (req as any).companyId;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const suggestions = await getPendingSuggestions(userId, companyId, limit);

    res.json({ data: suggestions });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// Histórico de sugestões aprovadas/rejeitadas
router.get('/suggestions/history', getCompanyId, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const companyId = (req as any).companyId;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const status = (req.query.status as string) || 'approved';

    const allowed = ['approved', 'rejected', 'auto_sent', 'pending'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'status inválido' });
    }

    const suggestions = await getDecidedSuggestions(
      userId,
      companyId,
      status as any,
      limit
    );

    res.json({ data: suggestions });
  } catch (error) {
    console.error('Error fetching suggestion history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Aprovar sugestão e treinar
router.post(
  '/suggestions/:id/approve',
  getCompanyId,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const companyId = (req as any).companyId;
      const { id } = req.params;
      const { approved_response } = req.body;

      const suggestion = await approveSuggestion(
        id,
        userId,
        companyId,
        approved_response
      );
      res.json({ data: suggestion });
    } catch (error) {
      console.error('Error approving suggestion:', error);
      res.status(500).json({ error: 'Failed to approve suggestion' });
    }
  }
);

// Rejeitar sugestão
router.post(
  '/suggestions/:id/reject',
  getCompanyId,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const companyId = (req as any).companyId;
      const { id } = req.params;
      const { feedback } = req.body;

      const suggestion = await rejectSuggestion(id, userId, companyId, feedback);
      res.json({ data: suggestion });
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      res.status(500).json({ error: 'Failed to reject suggestion' });
    }
  }
);

// Editar decisão de uma sugestão aprovada/rejeitada
router.post('/suggestions/:id/update', getCompanyId, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const companyId = (req as any).companyId;
    const { id } = req.params;
    const { status, approved_response, feedback } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status deve ser approved ou rejected' });
    }

    const suggestion = await updateSuggestionDecision(id, userId, companyId, {
      status,
      approved_response,
      feedback,
    });

    res.json({ data: suggestion });
  } catch (error) {
    console.error('Error updating suggestion decision:', error);
    res.status(500).json({ error: 'Failed to update suggestion' });
  }
});

// Obter status de auto-resposta
router.get('/auto-respond/status', getCompanyId, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const companyId = (req as any).companyId;

    const status = await getAutoRespondStatus(userId, companyId);
    res.json({ data: status });
  } catch (error) {
    console.error('Error fetching auto-respond status:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// Ativar/desativar auto-resposta
router.post('/auto-respond', getCompanyId, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const companyId = (req as any).companyId;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled deve ser boolean' });
    }

    const result = await setAutoRespondEnabled(userId, companyId, enabled);
    res.json({ data: result });
  } catch (error) {
    console.error('Error setting auto-respond:', error);
    res.status(500).json({ error: 'Failed to set auto-respond' });
  }
});

// ==================== LEARNING ENDPOINTS ====================

// Ensinar um novo conceito para a IA
router.post('/learning/teach', getCompanyId, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const companyId = (req as any).companyId;
    const { original_query, explanation, intent, examples, keywords } = req.body;

    if (!original_query || !explanation) {
      return res.status(400).json({ error: 'original_query e explanation são obrigatórios' });
    }

    const concept = await teachConcept({
      companyId,
      originalQuery: original_query,
      explanation,
      intent,
      examples: examples || [],
      keywords: keywords || [],
      userId,
    });

    res.status(201).json({ data: concept });
  } catch (error) {
    console.error('Error teaching concept:', error);
    res.status(500).json({ error: 'Failed to teach concept' });
  }
});

// Buscar conceitos similares (para detectar duplicatas ou sugerir conceitos existentes)
router.post('/learning/search', getCompanyId, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const { query, limit } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'query é obrigatório' });
    }

    const concepts = await findSimilarConcepts(query, companyId, limit || 5);
    res.json({ data: concepts });
  } catch (error) {
    console.error('Error searching concepts:', error);
    res.status(500).json({ error: 'Failed to search concepts' });
  }
});

// Listar todos os conceitos aprendidos
router.get('/learning/concepts', getCompanyId, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const intent = req.query.intent as string | undefined;

    const concepts = await getLearnedConcepts(companyId, intent);
    res.json({ data: concepts });
  } catch (error) {
    console.error('Error fetching concepts:', error);
    res.status(500).json({ error: 'Failed to fetch concepts' });
  }
});

// Atualizar um conceito existente
router.put('/learning/concepts/:id', getCompanyId, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const { id } = req.params;
    const { explanation, intent, examples, keywords } = req.body;

    const concept = await updateConcept(id, companyId, {
      explanation,
      intent,
      examples,
      keywords,
    });

    res.json({ data: concept });
  } catch (error) {
    console.error('Error updating concept:', error);
    res.status(500).json({ error: 'Failed to update concept' });
  }
});

// Deletar um conceito
router.delete('/learning/concepts/:id', getCompanyId, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const { id } = req.params;

    await deleteConcept(id, companyId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting concept:', error);
    res.status(500).json({ error: 'Failed to delete concept' });
  }
});

// ==================== VOCABULARY ENDPOINTS ====================

// Obter vocabulário da empresa (palavras e seus significados)
router.get('/vocabulary', getCompanyId, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;

    // Buscar a empresa e seu vocabulário armazenado
    const company = await (models as any).Company.findByPk(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const vocabulary = company.metadata?.vocabulary || [];
    res.json({ data: vocabulary });
  } catch (error) {
    console.error('Error fetching vocabulary:', error);
    res.status(500).json({ error: 'Failed to fetch vocabulary' });
  }
});

// Adicionar nova palavra ao vocabulário
router.post('/vocabulary/words', getCompanyId, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const { word, definition, synonyms = [], examples = [] } = req.body;

    if (!word || !definition) {
      return res.status(400).json({ error: 'word e definition são obrigatórios' });
    }

    const company = await (models as any).Company.findByPk(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const vocabulary = company.metadata?.vocabulary || [];
    
    // Verificar se palavra já existe
    const existingWord = vocabulary.find((v: any) => v.word.toLowerCase() === word.toLowerCase());
    if (existingWord) {
      return res.status(400).json({ error: 'Word already exists in vocabulary' });
    }

    // Adicionar palavra
    const newWord = {
      id: Date.now().toString(),
      word: word.trim(),
      definition: definition.trim(),
      synonyms: synonyms.map((s: string) => s.trim()).filter(Boolean),
      examples: examples.map((e: string) => e.trim()).filter(Boolean),
      created_at: new Date().toISOString(),
    };

    vocabulary.push(newWord);
    company.metadata = { ...(company.metadata || {}), vocabulary };
    await company.save();

    res.status(201).json({ data: newWord });
  } catch (error) {
    console.error('Error adding vocabulary word:', error);
    res.status(500).json({ error: 'Failed to add vocabulary word' });
  }
});

// Atualizar uma palavra do vocabulário
router.put('/vocabulary/words/:wordId', getCompanyId, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const { wordId } = req.params;
    const { definition, synonyms = [], examples = [] } = req.body;

    const company = await (models as any).Company.findByPk(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const vocabulary = company.metadata?.vocabulary || [];
    const wordIndex = vocabulary.findIndex((v: any) => v.id === wordId);

    if (wordIndex === -1) {
      return res.status(404).json({ error: 'Word not found' });
    }

    const updatedWord = {
      ...vocabulary[wordIndex],
      definition: definition?.trim() || vocabulary[wordIndex].definition,
      synonyms: synonyms.map((s: string) => s.trim()).filter(Boolean),
      examples: examples.map((e: string) => e.trim()).filter(Boolean),
      updated_at: new Date().toISOString(),
    };

    vocabulary[wordIndex] = updatedWord;
    company.metadata = { ...(company.metadata || {}), vocabulary };
    await company.save();

    res.json({ data: updatedWord });
  } catch (error) {
    console.error('Error updating vocabulary word:', error);
    res.status(500).json({ error: 'Failed to update vocabulary word' });
  }
});

// Deletar uma palavra do vocabulário
router.delete('/vocabulary/words/:wordId', getCompanyId, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const { wordId } = req.params;

    const company = await (models as any).Company.findByPk(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    let vocabulary = company.metadata?.vocabulary || [];
    vocabulary = vocabulary.filter((v: any) => v.id !== wordId);

    company.metadata = { ...(company.metadata || {}), vocabulary };
    await company.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting vocabulary word:', error);
    res.status(500).json({ error: 'Failed to delete vocabulary word' });
  }
});

// ==================== VOCABULARY SEEDING ====================

// Seed initial vocabulary for a company (English-based AI learning)
router.post('/vocabulary/seed', getCompanyId, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;

    console.log('[AI Routes] Starting vocabulary seed for company:', companyId);

    const result: any = await seedVocabulary(companyId, models);

    res.status(201).json({
      success: true,
      message: `Vocabulário inicial carregado com sucesso! ${result.seeded || 0} novas palavras adicionadas.`,
      data: result
    });
  } catch (error) {
    console.error('Error seeding vocabulary:', error);
    res.status(500).json({ error: 'Failed to seed vocabulary' });
  }
});

// Get vocabulary seeding statistics
router.get('/vocabulary/stats', async (req: Request, res: Response) => {
  try {
    const stats = getVocabularyStats();
    res.json({ data: stats });
  } catch (error) {
    console.error('Error getting vocabulary stats:', error);
    res.status(500).json({ error: 'Failed to get vocabulary stats' });
  }
});

export default router;

