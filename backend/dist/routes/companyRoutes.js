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
const companyService_1 = require("../services/company/companyService");
const router = express_1.default.Router();
/**
 * GET /api/companies
 * Get all companies with pagination
 */
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const Company = models_1.sequelize.models.Company;
        const { count, rows } = yield Company.findAndCountAll({
            offset,
            limit,
            attributes: ['id', 'name', 'email', 'phone', 'created_at'],
            include: [
                {
                    association: 'Plan',
                    attributes: ['id', 'name', 'max_email_connections', 'max_whatsapp_numbers'],
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
        console.error('Companies list error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}));
/**
 * GET /api/companies/:id
 * Get company by ID
 */
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const Company = models_1.sequelize.models.Company;
        const company = yield Company.findByPk(req.params.id, {
            attributes: ['id', 'name', 'email', 'phone', 'created_at', 'updated_at'],
            include: [
                {
                    association: 'Plan',
                    attributes: ['id', 'name', 'max_email_connections', 'max_whatsapp_numbers'],
                },
                {
                    association: 'Users',
                    attributes: ['id', 'email', 'role'],
                    through: { attributes: [] },
                },
            ],
        });
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }
        res.json(company);
    }
    catch (error) {
        console.error('Company detail error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}));
/**
 * POST /api/companies
 * Create new company
 */
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, phone, plan_id } = req.body;
        if (!name || !email) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // Create company and ensure an admin user exists and is linked
        const { company, user, generatedPassword } = yield (0, companyService_1.createCompanyWithAdmin)({ name, email, phone, plan_id });
        res.status(201).json({
            data: company,
            admin_user: { id: user.id, email: user.email, role: user.role },
            // Only return the initial password if a new admin user was created
            admin_initial_password: generatedPassword || undefined,
        });
    }
    catch (error) {
        console.error('Company creation error:', error);
        res.status(500).json({ error: 'Failed to create company' });
    }
}));
/**
 * PUT /api/companies/:id
 * Update company
 */
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, phone, plan_id } = req.body;
        const Company = models_1.sequelize.models.Company;
        const company = yield Company.findByPk(req.params.id);
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        if (name)
            company.name = name;
        if (email)
            company.email = email;
        if (phone !== undefined)
            company.phone = phone;
        if (plan_id)
            company.plan_id = plan_id;
        yield company.save();
        const result = yield Company.findByPk(company.id, {
            include: [{ association: 'Plan', attributes: ['id', 'name'] }],
        });
        res.json({ data: result });
    }
    catch (error) {
        console.error('Company update error:', error);
        res.status(500).json({ error: 'Failed to update company' });
    }
}));
/**
 * DELETE /api/companies/:id
 * Delete company
 */
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const Company = models_1.sequelize.models.Company;
        const company = yield Company.findByPk(req.params.id);
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        yield company.destroy();
        res.json({ message: 'Company deleted successfully' });
    }
    catch (error) {
        console.error('Company deletion error:', error);
        res.status(500).json({ error: 'Failed to delete company' });
    }
}));
exports.default = router;
