import express, { Request, Response } from 'express';
import models from '../models';

const router = express.Router();

// Get all connections for the authenticated user
router.get('/my-connections', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const connections = await models.UserConnection.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
    });

    res.json({ data: connections });
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

// Get plan limits for the authenticated user
router.get('/plan-limits', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await models.User.findByPk(userId, {
      include: [
        {
          model: models.Company,
          through: { attributes: [] },
          include: [
            {
              model: models.Plan,
            },
          ],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get the plan limits
    const company = (user as any).Companies?.[0];
    const plan = company?.Plan;

    if (!plan) {
      return res.json({
        max_email_connections: 0,
        max_whatsapp_connections: 0,
        current_email_connections: 0,
        current_whatsapp_connections: 0,
      });
    }

    // Count current connections by type
    const emailConnections = await models.UserConnection.count({
      where: { user_id: userId, type: 'email' },
    });

    const whatsappConnections = await models.UserConnection.count({
      where: { user_id: userId, type: 'whatsapp' },
    });

    res.json({
      max_email_connections: plan.max_email_connections || 0,
      max_whatsapp_connections: plan.max_whatsapp_numbers || 0,
      current_email_connections: emailConnections,
      current_whatsapp_connections: whatsappConnections,
    });
  } catch (error) {
    console.error('Error fetching plan limits:', error);
    res.status(500).json({ error: 'Failed to fetch plan limits' });
  }
});

// Create a new connection
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { type, name, config, whatsapp_number, whatsapp_name, whatsapp_status, whatsapp_avatar_url } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!type || !name || !config) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check plan limits
    const user = await models.User.findByPk(userId, {
      include: [
        {
          model: models.Company,
          through: { attributes: [] },
          include: [{ model: models.Plan }],
        },
      ],
    });

    const company = (user as any).Companies?.[0];
    const plan = company?.Plan;

    if (!plan) {
      return res.status(400).json({ error: 'User has no plan assigned' });
    }

    const currentConnections = await models.UserConnection.count({
      where: { user_id: userId, type },
    });

    const maxAllowed =
      type === 'email'
        ? plan.max_email_connections
        : plan.max_whatsapp_numbers;

    if (currentConnections >= maxAllowed) {
      return res.status(400).json({
        error: `You have reached the maximum limit of ${type} connections (${maxAllowed})`,
      });
    }

    const connection = await models.UserConnection.create({
      user_id: userId,
      type,
      name,
      config,
      status: 'active',
      // WhatsApp fields
      whatsapp_number,
      whatsapp_name,
      whatsapp_status,
      whatsapp_avatar_url,
    });

    res.status(201).json({ data: connection });
  } catch (error) {
    console.error('Error creating connection:', error);
    res.status(500).json({ error: 'Failed to create connection' });
  }
});

// Update a connection
router.put('/:connectionId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { connectionId } = req.params;
    const { name, config } = req.body;

    const connection = await models.UserConnection.findByPk(connectionId);

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    if ((connection as any).user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (name) (connection as any).name = name;
    if (config) (connection as any).config = config;

    await (connection as any).save();

    res.json({ data: connection });
  } catch (error) {
    console.error('Error updating connection:', error);
    res.status(500).json({ error: 'Failed to update connection' });
  }
});

// Delete a connection
router.delete('/:connectionId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { connectionId } = req.params;

    const connection = await models.UserConnection.findByPk(connectionId);

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    if ((connection as any).user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await (connection as any).destroy();

    res.json({ message: 'Connection deleted successfully' });
  } catch (error) {
    console.error('Error deleting connection:', error);
    res.status(500).json({ error: 'Failed to delete connection' });
  }
});

export default router;
