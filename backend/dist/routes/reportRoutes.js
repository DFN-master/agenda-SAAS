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
 * GET /api/reports/summary
 * Get report summary
 */
router.get('/summary', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
    }
    catch (error) {
        console.error('Report summary error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}));
/**
 * GET /api/reports/by-period
 * Get reports by period
 */
router.get('/by-period', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const period = req.query.period || 'month';
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
    }
    catch (error) {
        console.error('Report by period error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}));
exports.default = router;
