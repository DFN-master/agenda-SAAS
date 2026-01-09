import express, { Request, Response } from 'express';
import models from '../models';

const router = express.Router();

// Get all plans
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = (req.query.limit as string) ? parseInt(req.query.limit as string) : 20;
    const offset = (req.query.offset as string) ? parseInt(req.query.offset as string) : 0;

    const { count, rows } = await models.Plan.findAndCountAll({
      limit,
      offset,
      order: [['created_at', 'DESC']],
    });

    res.json({
      data: rows,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// Get single plan
router.get('/:planId', async (req: Request, res: Response) => {
  try {
    const plan = await models.Plan.findByPk(req.params.planId);

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json({ data: plan });
  } catch (error) {
    console.error('Error fetching plan:', error);
    res.status(500).json({ error: 'Failed to fetch plan' });
  }
});

// Create plan
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, price, max_email_connections, max_whatsapp_numbers } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const plan = await models.Plan.create({
      name,
      price,
      max_email_connections: max_email_connections || 1,
      max_whatsapp_numbers: max_whatsapp_numbers || 1,
    });

    res.status(201).json({ data: plan });
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

// Update plan
router.put('/:planId', async (req: Request, res: Response) => {
  try {
    const { name, price, max_email_connections, max_whatsapp_numbers } = req.body;

    const plan = await models.Plan.findByPk(req.params.planId);

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    if (name) (plan as any).name = name;
    if (price !== undefined) (plan as any).price = price;
    if (max_email_connections !== undefined) (plan as any).max_email_connections = max_email_connections;
    if (max_whatsapp_numbers !== undefined) (plan as any).max_whatsapp_numbers = max_whatsapp_numbers;

    await (plan as any).save();

    res.json({ data: plan });
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

// Delete plan
router.delete('/:planId', async (req: Request, res: Response) => {
  try {
    const plan = await models.Plan.findByPk(req.params.planId);

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    await (plan as any).destroy();

    res.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({ error: 'Failed to delete plan' });
  }
});

export default router;
