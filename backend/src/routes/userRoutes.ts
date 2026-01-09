import express, { Router, Request, Response } from 'express';
import { sequelize } from '../models';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const router: Router = express.Router();

/**
 * GET /api/users
 * Get all users with pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const User = sequelize.models.User;

    const { count, rows } = await User.findAndCountAll({
      offset,
      limit,
      attributes: ['id', 'email', 'role', 'created_at'],
      include: [
        {
          association: 'Companies',
          attributes: ['id', 'name'],
          through: { attributes: [] },
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
    console.error('Users list error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const User = sequelize.models.User;
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'email', 'role', 'created_at', 'updated_at'],
      include: [
        {
          association: 'Companies',
          attributes: ['id', 'name'],
          through: { attributes: [] },
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('User detail error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// continue with CRUD endpoints below
/**
 * POST /api/users
 * Create new user (optionally assign to a company)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, role, password, company_id } = req.body;

    if (!email || !role || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const User = sequelize.models.User;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ id: uuidv4(), email, password_hash: hash, role });

    // Optional company association
    if (company_id) {
      await sequelize.query(
        'INSERT INTO company_users (id, company_id, user_id, created_at) VALUES (:id, :company_id, :user_id, NOW()) ON CONFLICT DO NOTHING',
        {
          replacements: { id: uuidv4(), company_id, user_id: (user as any).id },
        }
      );
    }

    const result = await User.findByPk((user as any).id, {
      attributes: ['id', 'email', 'role', 'created_at'],
      include: [{ association: 'Companies', attributes: ['id', 'name'], through: { attributes: [] } }],
    });

    res.status(201).json({ data: result });
  } catch (error) {
    console.error('User creation error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * PUT /api/users/:id
 * Update user (email, role, password, company assignment)
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { email, role, password, company_id } = req.body;
    const User = sequelize.models.User;
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (email) (user as any).email = email;
    if (role) (user as any).role = role;
    if (password) {
      (user as any).password_hash = await bcrypt.hash(password, 10);
    }
    await (user as any).save();

    // Manage company assignment: replace existing mapping with provided one (if any)
    if (company_id !== undefined) {
      await sequelize.query('DELETE FROM company_users WHERE user_id = :user_id', {
        replacements: { user_id: (user as any).id },
      });
      if (company_id) {
        await sequelize.query(
          'INSERT INTO company_users (id, company_id, user_id, created_at) VALUES (:id, :company_id, :user_id, NOW()) ON CONFLICT DO NOTHING',
          {
            replacements: { id: uuidv4(), company_id, user_id: (user as any).id },
          }
        );
      }
    }

    const result = await User.findByPk((user as any).id, {
      attributes: ['id', 'email', 'role', 'created_at'],
      include: [{ association: 'Companies', attributes: ['id', 'name'], through: { attributes: [] } }],
    });

    res.json({ data: result });
  } catch (error) {
    console.error('User update error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const User = sequelize.models.User;
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await (user as any).destroy();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('User deletion error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
