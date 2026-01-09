import express, { Request, Response } from 'express';
import {
  activateEmailPolling,
  deactivateEmailPolling,
  isEmailPollingActive,
} from '../services/email/emailPollingManager';
import models from '../models';

const router = express.Router();

/**
 * POST /email/polling/:connectionId/start
 * Inicia polling de emails para uma conexão
 */
router.post(
  '/polling/:connectionId/start',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { connectionId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verificar se conexão pertence ao usuário e é do tipo email
      const connection = await models.UserConnection.findByPk(connectionId);

      if (!connection || (connection as any).user_id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      if ((connection as any).type !== 'email') {
        return res
          .status(400)
          .json({ error: 'Connection is not of type email' });
      }

      // Verificar se polling já está ativo
      if (isEmailPollingActive(connectionId)) {
        return res.status(400).json({ error: 'Polling already active' });
      }

      // Obter configuração de email
      const emailConfig = (connection as any).config;
      if (!emailConfig || !emailConfig.email || !emailConfig.password) {
        return res.status(400).json({ error: 'Invalid email configuration' });
      }

      // Ativar polling
      activateEmailPolling(connectionId, {
        email: emailConfig.email,
        password: emailConfig.password,
        imapHost: emailConfig.imap_host,
        imapPort: emailConfig.imap_port,
        imapTls: emailConfig.imap_tls,
      });

      res.json({
        success: true,
        message: 'Email polling started',
        connectionId,
      });
    } catch (error) {
      console.error('Error starting email polling:', error);
      res.status(500).json({ error: 'Failed to start email polling' });
    }
  }
);

/**
 * POST /email/polling/:connectionId/stop
 * Para polling de emails para uma conexão
 */
router.post(
  '/polling/:connectionId/stop',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { connectionId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verificar se conexão pertence ao usuário
      const connection = await models.UserConnection.findByPk(connectionId);

      if (!connection || (connection as any).user_id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Parar polling
      deactivateEmailPolling(connectionId);

      res.json({
        success: true,
        message: 'Email polling stopped',
        connectionId,
      });
    } catch (error) {
      console.error('Error stopping email polling:', error);
      res.status(500).json({ error: 'Failed to stop email polling' });
    }
  }
);

/**
 * GET /email/polling/:connectionId/status
 * Verifica se polling está ativo
 */
router.get(
  '/polling/:connectionId/status',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { connectionId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verificar se conexão pertence ao usuário
      const connection = await models.UserConnection.findByPk(connectionId);

      if (!connection || (connection as any).user_id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const active = isEmailPollingActive(connectionId);

      res.json({
        connectionId,
        polling_active: active,
      });
    } catch (error) {
      console.error('Error checking email polling status:', error);
      res.status(500).json({ error: 'Failed to check polling status' });
    }
  }
);

export default router;
