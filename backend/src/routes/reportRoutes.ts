import express, { Router, Request, Response } from 'express';

const router: Router = express.Router();

/**
 * GET /api/reports/summary
 * Get report summary
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const summary = {
      period: 'January 2026',
      totalAppointments: 45,
      completedAppointments: 38,
      canceledAppointments: 2,
      pendingAppointments: 5,
      emailsSent: 127,
      whatsappMessages: 89,
      clientsReached: 42,
      averageResponseTime: '2.4 hours',
    };

    res.json(summary);
  } catch (error) {
    console.error('Report summary error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/reports/by-period
 * Get reports by period
 */
router.get('/by-period', async (req: Request, res: Response) => {
  try {
    const period = req.query.period as string || 'month';

    const data = {
      period,
      data: [
        { date: '2026-01-01', appointments: 3, emails: 8, messages: 5 },
        { date: '2026-01-02', appointments: 5, emails: 12, messages: 7 },
        { date: '2026-01-03', appointments: 4, emails: 10, messages: 6 },
        { date: '2026-01-04', appointments: 6, emails: 15, messages: 9 },
        { date: '2026-01-05', appointments: 5, emails: 11, messages: 8 },
      ],
    };

    res.json(data);
  } catch (error) {
    console.error('Report by period error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
