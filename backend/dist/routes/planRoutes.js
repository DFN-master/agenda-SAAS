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
// Get all plans
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 20;
        const offset = req.query.offset ? parseInt(req.query.offset) : 0;
        const { count, rows } = yield models_1.default.Plan.findAndCountAll({
            limit,
            offset,
            order: [['created_at', 'DESC']],
        });
        res.json({
            data: rows,
            total: count,
            limit,
            offset,
        });
    }
    catch (error) {
        console.error('Error fetching plans:', error);
        res.status(500).json({ error: 'Failed to fetch plans' });
    }
}));
// Get single plan
router.get('/:planId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const plan = yield models_1.default.Plan.findByPk(req.params.planId);
        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }
        res.json({ data: plan });
    }
    catch (error) {
        console.error('Error fetching plan:', error);
        res.status(500).json({ error: 'Failed to fetch plan' });
    }
}));
// Create plan
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, price, max_email_connections, max_whatsapp_numbers } = req.body;
        if (!name || price === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const plan = yield models_1.default.Plan.create({
            name,
            price,
            max_email_connections: max_email_connections || 1,
            max_whatsapp_numbers: max_whatsapp_numbers || 1,
        });
        res.status(201).json({ data: plan });
    }
    catch (error) {
        console.error('Error creating plan:', error);
        res.status(500).json({ error: 'Failed to create plan' });
    }
}));
// Update plan
router.put('/:planId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, price, max_email_connections, max_whatsapp_numbers } = req.body;
        const plan = yield models_1.default.Plan.findByPk(req.params.planId);
        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }
        if (name)
            plan.name = name;
        if (price !== undefined)
            plan.price = price;
        if (max_email_connections !== undefined)
            plan.max_email_connections = max_email_connections;
        if (max_whatsapp_numbers !== undefined)
            plan.max_whatsapp_numbers = max_whatsapp_numbers;
        yield plan.save();
        res.json({ data: plan });
    }
    catch (error) {
        console.error('Error updating plan:', error);
        res.status(500).json({ error: 'Failed to update plan' });
    }
}));
// Delete plan
router.delete('/:planId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const plan = yield models_1.default.Plan.findByPk(req.params.planId);
        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }
        yield plan.destroy();
        res.json({ message: 'Plan deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting plan:', error);
        res.status(500).json({ error: 'Failed to delete plan' });
    }
}));
exports.default = router;
