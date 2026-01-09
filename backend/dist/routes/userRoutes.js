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
const uuid_1 = require("uuid");
const router = express_1.default.Router();
/**
 * GET /api/users
 * Get all users with pagination
 */
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const User = models_1.sequelize.models.User;
        const { count, rows } = yield User.findAndCountAll({
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
    }
    catch (error) {
        console.error('Users list error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}));
/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const User = models_1.sequelize.models.User;
        const user = yield User.findByPk(req.params.id, {
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
    }
    catch (error) {
        console.error('User detail error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}));
// continue with CRUD endpoints below
/**
 * POST /api/users
 * Create new user (optionally assign to a company)
 */
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, role, password, company_id } = req.body;
        if (!email || !role || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const User = models_1.sequelize.models.User;
        const existing = yield User.findOne({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'Email already in use' });
        }
        const hash = yield bcryptjs_1.default.hash(password, 10);
        const user = yield User.create({ id: (0, uuid_1.v4)(), email, password_hash: hash, role });
        // Optional company association
        if (company_id) {
            yield models_1.sequelize.query('INSERT INTO company_users (id, company_id, user_id, created_at) VALUES (:id, :company_id, :user_id, NOW()) ON CONFLICT DO NOTHING', {
                replacements: { id: (0, uuid_1.v4)(), company_id, user_id: user.id },
            });
        }
        const result = yield User.findByPk(user.id, {
            attributes: ['id', 'email', 'role', 'created_at'],
            include: [{ association: 'Companies', attributes: ['id', 'name'], through: { attributes: [] } }],
        });
        res.status(201).json({ data: result });
    }
    catch (error) {
        console.error('User creation error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
}));
/**
 * PUT /api/users/:id
 * Update user (email, role, password, company assignment)
 */
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, role, password, company_id } = req.body;
        const User = models_1.sequelize.models.User;
        const user = yield User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (email)
            user.email = email;
        if (role)
            user.role = role;
        if (password) {
            user.password_hash = yield bcryptjs_1.default.hash(password, 10);
        }
        yield user.save();
        // Manage company assignment: replace existing mapping with provided one (if any)
        if (company_id !== undefined) {
            yield models_1.sequelize.query('DELETE FROM company_users WHERE user_id = :user_id', {
                replacements: { user_id: user.id },
            });
            if (company_id) {
                yield models_1.sequelize.query('INSERT INTO company_users (id, company_id, user_id, created_at) VALUES (:id, :company_id, :user_id, NOW()) ON CONFLICT DO NOTHING', {
                    replacements: { id: (0, uuid_1.v4)(), company_id, user_id: user.id },
                });
            }
        }
        const result = yield User.findByPk(user.id, {
            attributes: ['id', 'email', 'role', 'created_at'],
            include: [{ association: 'Companies', attributes: ['id', 'name'], through: { attributes: [] } }],
        });
        res.json({ data: result });
    }
    catch (error) {
        console.error('User update error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
}));
/**
 * DELETE /api/users/:id
 * Delete user
 */
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const User = models_1.sequelize.models.User;
        const user = yield User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        yield user.destroy();
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        console.error('User deletion error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
}));
exports.default = router;
