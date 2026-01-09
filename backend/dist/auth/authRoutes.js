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
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const router = express_1.default.Router();
/**
 * POST /api/auth/login
 * Authenticate user with email and password
 */
router.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        // Get User model
        const User = models_1.sequelize.models.User;
        const Company = models_1.sequelize.models.Company;
        // Find user by email with companies
        const user = yield User.findOne({
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
        const ok = yield bcryptjs_1.default.compare(password, user.dataValues.password_hash);
        if (!ok) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // Simple dev token: base64 of email:userId (matches auth middleware)
        const token = Buffer.from(`${user.dataValues.email}:${user.dataValues.id}`).toString('base64');
        const response = {
            id: user.dataValues.id,
            email: user.dataValues.email,
            role: user.dataValues.role,
            Companies: user.dataValues.Companies || [],
            token,
            message: 'Login successful',
        };
        res.json(response);
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}));
/**
 * POST /api/auth/logout
 * Simple logout endpoint
 */
router.post('/logout', (req, res) => {
    res.json({ message: 'Logout successful' });
});
exports.default = router;
