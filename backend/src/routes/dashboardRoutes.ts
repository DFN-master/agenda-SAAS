import express, { Router, Request, Response } from 'express';
import { sequelize } from '../models';

const router: Router = express.Router();

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const User = sequelize.models.User;
    const Company = sequelize.models.Company;

    // Get total users count
    const totalUsers = await User.count();

    // Get total companies count
    const totalCompanies = await Company.count();

    // Get today's appointments (placeholder - implement when appointment model exists)
    const todayAppointments = 0;

    const stats = {
      todayAppointments,
      totalClients: totalCompanies,
      totalUsers,
      emailsSent: 0, // Will be implemented with email service tracking
      whatsappMessages: 0, // Will be implemented with WhatsApp service tracking
    };

    res.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
