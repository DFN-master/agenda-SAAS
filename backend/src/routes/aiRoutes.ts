import express, { Request, Response } from 'express';
import { createAiEvent, getAiContext } from '../services/ai/aiEventService';
import {
  createConversationSuggestion,
  approveSuggestion,
  rejectSuggestion,
  getPendingSuggestions,
  getAutoRespondStatus,
  setAutoRespondEnabled,
} from '../services/ai/aiConversationService';
import models from '../models';

const router = express.Router();

// Middleware para verificar company_id e user_id
const getCompanyId = async (req: any, res: Response, next: any) => {
  const userId = req.userId;
  const companyId = req.query.company_id || req.body.company_id;

  if (!companyId) {
    return res.status(400).json({ error: 'company_id é obrigatório' });
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

  if (!user || !(user as any).Companies?.some((c: any) => c.id === companyId)) {
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
    const { connection_id, client_ref, incoming_message } = req.body;

    if (!incoming_message) {
      return res.status(400).json({ error: 'incoming_message é obrigatório' });
    }

    const suggestion = await createConversationSuggestion({
      userId,
      companyId,
      connectionId: connection_id,
      clientRef: client_ref,
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

export default router;

