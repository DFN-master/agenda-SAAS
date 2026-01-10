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
const models_1 = __importDefault(require("../models"));
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
        const company_id = req.query.company_id;
        // Build query
        const where = {};
        if (status)
            where.status = status;
        if (company_id)
            where.company_id = company_id;
        const { rows, count } = yield models_1.default.Appointment.findAndCountAll({
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
        const { company_id, client_name, appointment_date, appointment_time, service_description, extraction_confidence, notes, user_id, status, } = req.body;
        // Validate required fields
        if (!company_id || !client_name || !appointment_date || !appointment_time) {
            return res.status(400).json({ message: 'Missing required fields: company_id, client_name, appointment_date, appointment_time' });
        }
        // Create appointment
        const created = yield models_1.default.Appointment.create({
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
    }
    catch (error) {
        console.error('Create appointment error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}));
/**
 * POST /api/appointments/confirm
 * Confirm an existing appointment (sets status to 'confirmed')
 */
router.post('/confirm', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { appointment_id, company_id } = req.body;
        if (!appointment_id || !company_id) {
            return res.status(400).json({ message: 'Missing required fields: appointment_id, company_id' });
        }
        const appt = yield models_1.default.Appointment.findOne({ where: { id: appointment_id, company_id } });
        if (!appt) {
            return res.status(404).json({ message: 'Appointment not found' });
        }
        yield appt.update({ status: 'confirmed' });
        res.json(appt);
    }
    catch (error) {
        console.error('Confirm appointment error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}));
exports.default = router;
