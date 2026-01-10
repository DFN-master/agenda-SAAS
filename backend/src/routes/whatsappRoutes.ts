import express, { Request, Response } from 'express';
import { sendTextMessage } from '../services/whatsapp/whatsappService';
import { createConversationSuggestion } from '../services/ai/aiConversationService';
import {
  sendAppointmentReminder,
  sendAppointmentConfirmation,
  sendAppointmentCancellation,
  sendCustomMessage,
  getActiveConnectionId,
  sendAutoAppointmentReminder,
  formatPhoneToJid,
} from '../services/whatsapp/whatsappNotificationService';
import models from '../models';

const router = express.Router();

// Middleware para validar company_id do usuário
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

  const user = await (models as any).User.findByPk(userId, {
    include: [{ model: (models as any).Company, through: { attributes: [] } }],
  });

  const userCompanies = (user as any)?.Companies || [];
  const belongsToCompany = userCompanies.some((c: any) => String(c.id) === companyId);

  if (!user || !belongsToCompany) {
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
    const normalizedConnectionId = Number.isFinite(Number(connection_id))
      ? Number(connection_id)
      : undefined;

    if (!message_text) {
      return res.status(400).json({ error: 'message_text é obrigatório' });
    }

    const suggestion = await createConversationSuggestion({
      userId,
      companyId,
      connectionId: normalizedConnectionId,
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

/**
 * POST /whatsapp/send
 * Envia mensagem simples para um número de telefone
 * Body: { company_id, phone, message }
 */
router.post('/send', getCompanyId, async (req: any, res: Response) => {
  try {
    const companyId = req.companyId as string;
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: 'phone e message são obrigatórios' });
    }

    const connectionId = await getActiveConnectionId(companyId);
    if (!connectionId) {
      return res.status(404).json({ error: 'Nenhuma conexão WhatsApp ativa encontrada' });
    }

    const sent = await sendCustomMessage(connectionId, phone, message);
    if (!sent) {
      return res.status(500).json({ error: 'Falha ao enviar mensagem' });
    }

    res.json({ 
      success: true,
      message: 'Mensagem enviada com sucesso',
      jid: formatPhoneToJid(phone),
    });
  } catch (error) {
    console.error('WhatsApp send error:', error);
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
});

/**
 * POST /whatsapp/send-reminder
 * Envia lembrete de agendamento
 * Body: { company_id, phone, clientName, date, time, service?, location? }
 */
router.post('/send-reminder', getCompanyId, async (req: any, res: Response) => {
  try {
    const companyId = req.companyId as string;
    const { phone, clientName, date, time, service, location } = req.body;

    if (!phone || !clientName || !date || !time) {
      return res.status(400).json({ 
        error: 'phone, clientName, date e time são obrigatórios' 
      });
    }

    const result = await sendAutoAppointmentReminder(companyId, phone, {
      clientName,
      date,
      time,
      service,
      location,
    });

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ 
      success: true,
      message: 'Lembrete enviado com sucesso',
      jid: formatPhoneToJid(phone),
    });
  } catch (error) {
    console.error('WhatsApp send-reminder error:', error);
    res.status(500).json({ error: 'Erro ao enviar lembrete' });
  }
});

/**
 * POST /whatsapp/send-confirmation
 * Envia confirmação de agendamento
 * Body: { company_id, phone, clientName, date, time, service?, confirmationCode? }
 */
router.post('/send-confirmation', getCompanyId, async (req: any, res: Response) => {
  try {
    const companyId = req.companyId as string;
    const { phone, clientName, date, time, service, confirmationCode } = req.body;

    if (!phone || !clientName || !date || !time) {
      return res.status(400).json({ 
        error: 'phone, clientName, date e time são obrigatórios' 
      });
    }

    const connectionId = await getActiveConnectionId(companyId);
    if (!connectionId) {
      return res.status(404).json({ error: 'Nenhuma conexão WhatsApp ativa encontrada' });
    }

    const sent = await sendAppointmentConfirmation(connectionId, phone, {
      clientName,
      date,
      time,
      service,
      confirmationCode,
    });

    if (!sent) {
      return res.status(500).json({ error: 'Falha ao enviar confirmação' });
    }

    res.json({ 
      success: true,
      message: 'Confirmação enviada com sucesso',
      jid: formatPhoneToJid(phone),
    });
  } catch (error) {
    console.error('WhatsApp send-confirmation error:', error);
    res.status(500).json({ error: 'Erro ao enviar confirmação' });
  }
});

/**
 * POST /whatsapp/send-cancellation
 * Envia notificação de cancelamento
 * Body: { company_id, phone, clientName, date, time, reason? }
 */
router.post('/send-cancellation', getCompanyId, async (req: any, res: Response) => {
  try {
    const companyId = req.companyId as string;
    const { phone, clientName, date, time, reason } = req.body;

    if (!phone || !clientName || !date || !time) {
      return res.status(400).json({ 
        error: 'phone, clientName, date e time são obrigatórios' 
      });
    }

    const connectionId = await getActiveConnectionId(companyId);
    if (!connectionId) {
      return res.status(404).json({ error: 'Nenhuma conexão WhatsApp ativa encontrada' });
    }

    const sent = await sendAppointmentCancellation(connectionId, phone, {
      clientName,
      date,
      time,
      reason,
    });

    if (!sent) {
      return res.status(500).json({ error: 'Falha ao enviar cancelamento' });
    }

    res.json({ 
      success: true,
      message: 'Notificação de cancelamento enviada',
      jid: formatPhoneToJid(phone),
    });
  } catch (error) {
    console.error('WhatsApp send-cancellation error:', error);
    res.status(500).json({ error: 'Erro ao enviar notificação de cancelamento' });
  }
});

export default router;
