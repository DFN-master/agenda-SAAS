import express, { Router, Request, Response } from 'express';
import { sequelize } from '../models';

const router: Router = express.Router();

/**
 * GET /api/appointments
 * Get all appointments with pagination and filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;

    // Build query
    const where: any = {};
    if (status) {
      where.status = status;
    }

    // Mock data for now - in production, query the appointments table
    const appointments = [
      {
        id: '1',
        title: 'Reunião com Cliente',
        description: 'Discussão sobre novo projeto',
        scheduled_at: new Date(Date.now() + 86400000),
        status: 'scheduled',
        client_email: 'cliente@example.com',
        created_at: new Date(),
      },
      {
        id: '2',
        title: 'Acompanhamento',
        description: 'Follow-up do projeto anterior',
        scheduled_at: new Date(Date.now() + 172800000),
        status: 'scheduled',
        client_email: 'outro@example.com',
        created_at: new Date(),
      },
    ];

    res.json({
      total: appointments.length,
      page,
      limit,
      totalPages: Math.ceil(appointments.length / limit),
      data: appointments.slice(offset, offset + limit),
    });
  } catch (error) {
    console.error('Appointments list error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/appointments
 * Create a new appointment
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, scheduled_at, client_email } = req.body;

    // Validate input
    if (!title || !scheduled_at || !client_email) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Mock response - in production, save to database
    const appointment = {
      id: Date.now().toString(),
      title,
      description,
      scheduled_at,
      status: 'scheduled',
      client_email,
      created_at: new Date(),
    };

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
