"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
/**
 * GET /api/appointments
 * Get all appointments with pagination and filtering
 */
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const status = req.query.status;
        // Build query
        const where = {};
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
    }
    catch (error) {
        console.error('Appointments list error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}));
/**
 * POST /api/appointments
 * Create a new appointment
 */
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
    }
    catch (error) {
        console.error('Create appointment error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}));
exports.default = router;
