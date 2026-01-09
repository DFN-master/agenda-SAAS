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
const models_1 = require("../models");
const router = express_1.default.Router();
/**
 * GET /api/dashboard/stats
 * Get dashboard statistics
 */
router.get('/stats', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const User = models_1.sequelize.models.User;
        const Company = models_1.sequelize.models.Company;
        // Get total users count
        const totalUsers = yield User.count();
        // Get total companies count
        const totalCompanies = yield Company.count();
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
    }
    catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}));
exports.default = router;
