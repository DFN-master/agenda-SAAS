import 'dotenv/config';
import express from 'express';
import { sequelize } from './models';
import authRoutes from './auth/authRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import userRoutes from './routes/userRoutes';
import companyRoutes from './routes/companyRoutes';
import planRoutes from './routes/planRoutes';
import appointmentRoutes from './routes/appointmentRoutes';
import reportRoutes from './routes/reportRoutes';
import integrationRoutes from './routes/integrationRoutes';
import connectionRoutes from './routes/connectionRoutes';
import aiRoutes from './routes/aiRoutes';
import aiWordMeaningRoutes from './routes/aiWordMeaningRoutes';
import whatsappRoutes from './routes/whatsappRoutes';
import { ensureWhatsMeowConnections } from './services/whatsapp/whatsappService';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// CORS middleware (allowing localhost for development)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Authentication middleware
const authMiddleware = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [email, userId] = decoded.split(':');
      req.email = email;
      // For development, accept userId from token if provided, else fallback to super admin UUID
      req.userId = userId || '00000000-0000-0000-0000-000000000001';
    } catch (err) {
      console.error('Invalid token:', err);
      req.userId = '00000000-0000-0000-0000-000000000001';
    }
  } else {
    // Fallback in dev
    req.userId = '00000000-0000-0000-0000-000000000001';
  }
  next();
};

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/connections', authMiddleware, connectionRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/ai', authMiddleware, aiWordMeaningRoutes);
app.use('/api/whatsapp', authMiddleware, whatsappRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ message: 'Agenda-Sys API', version: '1.0.0' });
});

// Test database connection
sequelize.authenticate()
  .then(() => console.log('Database connected successfully'))
  .catch((err) => console.error('Database connection failed:', err));

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

  // Ensure WhatsMeow connections are reconnected
  ensureWhatsMeowConnections();
});