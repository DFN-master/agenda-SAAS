import express, { Router, Request, Response } from 'express';
import models, { sequelize } from '../models';

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
    const company_id = req.query.company_id as string;

    // Build query
    const where: any = {};
    if (status) where.status = status;
    if (company_id) where.company_id = company_id;

    const { rows, count } = await models.Appointment.findAndCountAll({
      where,
      order: [['updated_at', 'DESC']],
      limit,
      offset,
    });

    res.json({
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      data: rows,
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
    const {
      company_id,
      client_name,
      appointment_date,
      appointment_time,
      service_description,
      extraction_confidence,
      notes,
      user_id,
      status,
    } = req.body;

    // Validate required fields
    if (!company_id || !client_name || !appointment_date || !appointment_time) {
      return res.status(400).json({ message: 'Missing required fields: company_id, client_name, appointment_date, appointment_time' });
    }

    // Create appointment
    const created = await models.Appointment.create({
      company_id,
      client_name,
      appointment_date,
      appointment_time,
      service_description,
      extraction_confidence,
      notes,
      user_id,
      status: status || 'pending',
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/appointments/confirm
 * Confirm an existing appointment (sets status to 'confirmed')
 */
router.post('/confirm', async (req: Request, res: Response) => {
  try {
    const { appointment_id, company_id } = req.body;
    if (!appointment_id || !company_id) {
      return res.status(400).json({ message: 'Missing required fields: appointment_id, company_id' });
    }

    const appt = await models.Appointment.findOne({ where: { id: appointment_id, company_id } });
    if (!appt) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    await appt.update({ status: 'confirmed' });
    res.json(appt);
  } catch (error) {
    console.error('Confirm appointment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
