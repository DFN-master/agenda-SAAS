"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const models_1 = require("./models");
const authRoutes_1 = __importDefault(require("./auth/authRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const companyRoutes_1 = __importDefault(require("./routes/companyRoutes"));
const planRoutes_1 = __importDefault(require("./routes/planRoutes"));
const appointmentRoutes_1 = __importDefault(require("./routes/appointmentRoutes"));
const reportRoutes_1 = __importDefault(require("./routes/reportRoutes"));
const integrationRoutes_1 = __importDefault(require("./routes/integrationRoutes"));
const connectionRoutes_1 = __importDefault(require("./routes/connectionRoutes"));
const aiRoutes_1 = __importDefault(require("./routes/aiRoutes"));
const aiWordMeaningRoutes_1 = __importDefault(require("./routes/aiWordMeaningRoutes"));
const whatsappRoutes_1 = __importDefault(require("./routes/whatsappRoutes"));
const whatsappService_1 = require("./services/whatsapp/whatsappService");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use(express_1.default.json());
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
const authMiddleware = (req, res, next) => {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
    if (token) {
        try {
            const decoded = Buffer.from(token, 'base64').toString('utf-8');
            const [email, userId] = decoded.split(':');
            req.email = email;
            // For development, accept userId from token if provided, else fallback to super admin UUID
            req.userId = userId || '00000000-0000-0000-0000-000000000001';
        }
        catch (err) {
            console.error('Invalid token:', err);
            req.userId = '00000000-0000-0000-0000-000000000001';
        }
    }
    else {
        // Fallback in dev
        req.userId = '00000000-0000-0000-0000-000000000001';
    }
    next();
};
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/dashboard', dashboardRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/companies', companyRoutes_1.default);
app.use('/api/plans', planRoutes_1.default);
app.use('/api/appointments', appointmentRoutes_1.default);
app.use('/api/reports', reportRoutes_1.default);
app.use('/api/integrations', integrationRoutes_1.default);
app.use('/api/connections', authMiddleware, connectionRoutes_1.default);
app.use('/api/ai', authMiddleware, aiRoutes_1.default);
app.use('/api/ai', authMiddleware, aiWordMeaningRoutes_1.default);
app.use('/api/whatsapp', authMiddleware, whatsappRoutes_1.default);
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/', (req, res) => {
    res.json({ message: 'Agenda-Sys API', version: '1.0.0' });
});
// Test database connection
models_1.sequelize.authenticate()
    .then(() => console.log('Database connected successfully'))
    .catch((err) => console.error('Database connection failed:', err));
// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    // Ensure WhatsMeow connections are reconnected
    (0, whatsappService_1.ensureWhatsMeowConnections)();
});
