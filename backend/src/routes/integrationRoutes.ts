import express, { Router, Request, Response } from 'express';

const router: Router = express.Router();

/**
 * GET /api/integrations
 * Get integration status
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const integrations = {
      email: {
        name: 'Email (IMAP)',
        status: 'disconnected',
        description: 'Integração com serviço de email',
        config: {
          imap_host: '',
          imap_port: 993,
          email: '',
        },
      },
      whatsapp: {
        name: 'WhatsApp',
        status: 'disconnected',
        description: 'Integração com WhatsApp Business',
        config: {
          phone_number: '',
          api_key: '',
        },
      },
    };

    res.json(integrations);
  } catch (error) {
    console.error('Integrations error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/integrations/:type/connect
 * Connect an integration
 */
router.post('/:type/connect', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const config = req.body;

    // Validate type
    if (!['email', 'whatsapp'].includes(type)) {
      return res.status(400).json({ message: 'Invalid integration type' });
    }

    // In production, validate and save configuration
    const result = {
      type,
      status: 'connected',
      message: `${type} integration configured successfully`,
      timestamp: new Date(),
    };

    res.json(result);
  } catch (error) {
    console.error('Integration connect error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/integrations/:type/disconnect
 * Disconnect an integration
 */
router.post('/:type/disconnect', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;

    const result = {
      type,
      status: 'disconnected',
      message: `${type} integration disconnected`,
      timestamp: new Date(),
    };

    res.json(result);
  } catch (error) {
    console.error('Integration disconnect error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
