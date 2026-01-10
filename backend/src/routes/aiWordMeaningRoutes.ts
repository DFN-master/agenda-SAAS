import { Router, Request, Response } from 'express';
import models from '../models';

const router = Router();

/**
 * GET /api/ai/word-meanings?company_id=uuid&status=pending
 * List word meanings by company and status.
 */
router.get('/word-meanings', async (req: Request, res: Response) => {
  try {
    const { company_id, status = 'pending', limit = 50, offset = 0 } = req.query;

    if (!company_id) {
      return res.status(400).json({ error: 'company_id is required' });
    }

    const where: any = { company_id };
    if (status) where.status = status;

    const meanings = await models.AiWordMeaning.findAll({
      where,
      limit: parseInt(limit as string) || 50,
      offset: parseInt(offset as string) || 0,
      order: [['created_at', 'DESC']],
    });

    return res.json({ data: meanings, total: meanings.length });
  } catch (error: any) {
    console.error('[AI] Error fetching word meanings:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/ai/word-meanings/:id
 * Update a word meaning (approve, reject, or provide definition).
 * Body: { definition, status }
 */
router.patch('/word-meanings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { definition, status } = req.body;

    const meaning = await models.AiWordMeaning.findByPk(id);
    if (!meaning) {
      return res.status(404).json({ error: 'Word meaning not found' });
    }

    // Only admin can approve
    if (definition !== undefined) {
      (meaning as any).definition = definition;
    }
    if (status !== undefined && ['pending', 'approved', 'rejected'].includes(status)) {
      (meaning as any).status = status;
    }
    (meaning as any).updated_at = new Date();

    await meaning.save();

    return res.json({ data: meaning });
  } catch (error: any) {
    console.error('[AI] Error updating word meaning:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/ai/word-meanings/:id
 * Delete a pending word meaning (e.g., if irrelevant).
 */
router.delete('/word-meanings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const meaning = await models.AiWordMeaning.findByPk(id);
    if (!meaning) {
      return res.status(404).json({ error: 'Word meaning not found' });
    }

    await meaning.destroy();

    return res.json({ message: 'Word meaning deleted' });
  } catch (error: any) {
    console.error('[AI] Error deleting word meaning:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
