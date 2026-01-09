import express, { Router, Request, Response } from 'express';
import { sequelize } from '../models';
import { createCompanyWithAdmin } from '../services/company/companyService';

const router: Router = express.Router();

/**
 * GET /api/companies
 * Get all companies with pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const Company = sequelize.models.Company;

    const { count, rows } = await Company.findAndCountAll({
      offset,
      limit,
      attributes: ['id', 'name', 'email', 'phone', 'created_at'],
      include: [
        {
          association: 'Plan',
          attributes: ['id', 'name', 'max_email_connections', 'max_whatsapp_numbers'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    res.json({
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      data: rows,
    });
  } catch (error) {
    console.error('Companies list error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/companies/:id
 * Get company by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const Company = sequelize.models.Company;
    const company = await Company.findByPk(req.params.id, {
      attributes: ['id', 'name', 'email', 'phone', 'created_at', 'updated_at'],
      include: [
        {
          association: 'Plan',
          attributes: ['id', 'name', 'max_email_connections', 'max_whatsapp_numbers'],
        },
        {
          association: 'Users',
          attributes: ['id', 'email', 'role'],
          through: { attributes: [] },
        },
      ],
    });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.json(company);
  } catch (error) {
    console.error('Company detail error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/companies
 * Create new company
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, plan_id } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create company and ensure an admin user exists and is linked
    const { company, user, generatedPassword } = await createCompanyWithAdmin({ name, email, phone, plan_id });

    res.status(201).json({
      data: company,
      admin_user: { id: (user as any).id, email: (user as any).email, role: (user as any).role },
      // Only return the initial password if a new admin user was created
      admin_initial_password: generatedPassword || undefined,
    });
  } catch (error) {
    console.error('Company creation error:', error);
    res.status(500).json({ error: 'Failed to create company' });
  }
});

/**
 * PUT /api/companies/:id
 * Update company
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, plan_id } = req.body;

    const Company = sequelize.models.Company;
    const company = await Company.findByPk(req.params.id);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (name) (company as any).name = name;
    if (email) (company as any).email = email;
    if (phone !== undefined) (company as any).phone = phone;
    if (plan_id) (company as any).plan_id = plan_id;

    await (company as any).save();

    const result = await Company.findByPk((company as any).id, {
      include: [{ association: 'Plan', attributes: ['id', 'name'] }],
    });

    res.json({ data: result });
  } catch (error) {
    console.error('Company update error:', error);
    res.status(500).json({ error: 'Failed to update company' });
  }
});

/**
 * DELETE /api/companies/:id
 * Delete company
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const Company = sequelize.models.Company;
    const company = await Company.findByPk(req.params.id);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    await (company as any).destroy();

    res.json({ message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Company deletion error:', error);
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

export default router;
