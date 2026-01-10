import express, { Router, Request, Response } from 'express';
import models from '../models';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

const router: Router = express.Router();

// Helper: ensure company access via auth middleware context
const getCompanyId = async (req: any, res: Response, next: any) => {
  const userId = req.userId;
  const companyId = String(req.query.company_id || req.body.company_id || '').trim();

  if (!companyId) return res.status(400).json({ error: 'company_id é obrigatório' });

  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (!uuidRegex.test(companyId)) return res.status(400).json({ error: 'company_id deve ser UUID' });

  const user = await (models as any).User.findByPk(userId, {
    include: [{ model: (models as any).Company, through: { attributes: [] } }],
  });
  const belongs = (user as any)?.Companies?.some((c: any) => String(c.id) === companyId);
  if (!user || !belongs) return res.status(403).json({ error: 'Unauthorized company access' });

  req.companyId = companyId;
  next();
};

/**
 * POST /api/chat/conversations
 * Creates a new web chat conversation and returns client_ref
 */
router.post('/conversations', getCompanyId, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId as string;
    const clientRef = `web:${uuidv4()}`;

    // Optionally store a system message marking conversation start
    await (models as any).AiConversationMessage.create({
      company_id: companyId,
      user_id: (req as any).userId,
      client_ref: clientRef,
      direction: 'sent',
      message_text: '[system] Conversa iniciada',
      metadata: { channel: 'web', conversation_started: true },
    });

    res.status(201).json({ data: { client_ref: clientRef } });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

/**
 * GET /api/chat/messages
 * Lists recent messages for a conversation
 */
router.get('/messages', getCompanyId, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId as string;
    const clientRef = String(req.query.client_ref || '').trim();
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    if (!clientRef) return res.status(400).json({ error: 'client_ref é obrigatório' });

    const rows = await (models as any).AiConversationMessage.findAll({
      where: { company_id: companyId, client_ref: clientRef },
      order: [['created_at', 'ASC']],
      limit,
    });

    res.json({ data: rows });
  } catch (error) {
    console.error('List messages error:', error);
    res.status(500).json({ error: 'Failed to list messages' });
  }
});

/**
 * POST /api/chat/send
 * Sends a message, stores it, calls cognitive engine, stores IA reply
 */
router.post('/send', getCompanyId, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const companyId = (req as any).companyId as string;
    const { client_ref, message_text } = req.body;

    if (!client_ref || !message_text) {
      return res.status(400).json({ error: 'client_ref e message_text são obrigatórios' });
    }

    // Store user message (received)
    const userMsg = await (models as any).AiConversationMessage.create({
      company_id: companyId,
      user_id: userId,
      client_ref,
      direction: 'received',
      message_text,
      metadata: { channel: 'web' },
    });

    // Build context from last messages
    const lastMessages = await (models as any).AiConversationMessage.findAll({
      where: { company_id: companyId, client_ref },
      order: [['created_at', 'DESC']],
      limit: 10,
    });
    const contextSummary = lastMessages
      .slice()
      .reverse()
      .map((m: any) => `${m.direction === 'received' ? 'Cliente' : 'IA'}: ${m.message_text}`)
      .join('\n');

    // Call cognitive engine
    const aiUrl = process.env.COGNITIVE_ENGINE_URL || 'http://localhost:5001/cognitive-response';
    const resp = await fetch(aiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: companyId,
        incoming_message: message_text,
        client_ref,
        context_summary: contextSummary,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Cognitive engine error ${resp.status}: ${text}`);
    }

    const data = (await resp.json()) as any;
    const suggested = String(data.suggested_response || '').trim();

    // Store IA response (sent)
    const aiMsg = await (models as any).AiConversationMessage.create({
      company_id: companyId,
      user_id: userId,
      client_ref,
      direction: 'sent',
      message_text: suggested || '...',
      metadata: { channel: 'web', ai_meta: { intent: data.detected_intent, confidence: data.intent_confidence } },
    });

    res.status(201).json({ data: { user_message: userMsg, ai_message: aiMsg, ai_payload: data } });
  } catch (error) {
    console.error('Chat send error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
