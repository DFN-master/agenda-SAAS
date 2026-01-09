import express, { Router, Request, Response } from 'express';
import { sequelize } from '../models';
import bcrypt from 'bcryptjs';

const router: Router = express.Router();

interface LoginRequest extends Request {
  body: {
    email: string;
    password: string;
  };
}

interface LoginResponse {
  id: string;
  email: string;
  role: string;
  token: string;
  Companies?: any[];
  message?: string;
}

/**
 * POST /api/auth/login
 * Authenticate user with email and password
 */
router.post('/login', async (req: LoginRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Get User model
    const User = sequelize.models.User;
    const Company = sequelize.models.Company;

    // Find user by email with companies
    const user = await User.findOne({ 
      where: { email },
      include: [{
        model: Company,
        through: { attributes: [] }
      }]
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare password with stored hash
    const ok = await bcrypt.compare(password, user.dataValues.password_hash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Simple dev token: base64 of email:userId (matches auth middleware)
    const token = Buffer.from(`${user.dataValues.email}:${user.dataValues.id}`).toString('base64');

    const response: LoginResponse = {
      id: user.dataValues.id,
      email: user.dataValues.email,
      role: user.dataValues.role,
      Companies: user.dataValues.Companies || [],
      token,
      message: 'Login successful',
    };

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error'