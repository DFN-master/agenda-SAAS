import express, { Request, Response } from 'express';
import { sendTextMessage } from '../services/whatsapp/whatsappService';
import { createConversationSuggestion } from '../services/ai/aiConversationService';
import models from '../models';

const router = express.Router();

// Middleware para validar company_id do usuário
const getCompanyId = async (req: any, res: Response, next: any) => {
  const userId = req.userId;
  const companyId = req.query.company_id || req.body.company_id;

  if (!companyId) {
    return res.status(400).json({ error: 'company_id é obrigatório' });
  }

  const user = await (models as any).User.findByPk(userId, {
    include: [{ model: (models as any).Company, through: { attributes: [] } }],
  });

  if (!user || !(user as any).Companies?.some((c: any) => c.id === companyId)) {
    return res.status(403).json({ error: 'Unauthorized company access' });
  }

  req.companyId = companyId;
  next();
};

/**
 * Inbound webhook para mensagens do WhatsApp
 * Body: { company_id, connection_id, jid (ou client_ref), message_text }
 */
router.post('/webhook', getCompanyId, async (req: any, res: Response) => {
  try {
    const userId = req.userId;
    const companyId = req.companyId as string;
    const { connection_id, jid, client_ref, message_text } = req.body;

    if (!message_text) {
      return res.status(400).json({ error: 'message_text é obrigatório' });
    }

    const suggestion = await createConversationSuggestion({
      userId,
      companyId,
      connectionId: connection_id,
      clientRef: jid || client_ref,
      incomingMessage: message_text,
    });

    res.status(201).json({ data: suggestion });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

/**
 * Envio de mensagens de saída via WhatsApp
 * Params: connectionId (não utilizado em instância única)
 * Body: { jid, message }
 */
router.post('/connections/:connectionId/send-message', async (req: Request, res: Response) => {
  try {
    const { jid, message } = req.body as any;
    const { connectionId } = req.params as any;
    if (!jid || !message) {
      return res.status(400).json({ error: 'jid e message são obrigatórios' });
    }

    await sendTextMessage(String(connectionId), jid, message);

    res.json({ success: true });
  } catch (error) {
    console.error('WhatsApp send-message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
