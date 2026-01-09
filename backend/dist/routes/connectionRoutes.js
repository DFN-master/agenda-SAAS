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
// Get all connections for the authenticated user
router.get('/my-connections', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const connections = yield models_1.default.UserConnection.findAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']],
        });
        res.json({ data: connections });
    }
    catch (error) {
        console.error('Error fetching connections:', error);
        res.status(500).json({ error: 'Failed to fetch connections' });
    }
}));
// Get plan limits for the authenticated user
router.get('/plan-limits', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const user = yield models_1.default.User.findByPk(userId, {
            include: [
                {
                    model: models_1.default.Company,
                    through: { attributes: [] },
                    include: [
                        {
                            model: models_1.default.Plan,
                        },
                    ],
                },
            ],
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Get the plan limits
        const company = (_a = user.Companies) === null || _a === void 0 ? void 0 : _a[0];
        const plan = company === null || company === void 0 ? void 0 : company.Plan;
        if (!plan) {
            return res.json({
                max_email_connections: 0,
                max_whatsapp_connections: 0,
                current_email_connections: 0,
                current_whatsapp_connections: 0,
            });
        }
        // Count current connections by type
        const emailConnections = yield models_1.default.UserConnection.count({
            where: { user_id: userId, type: 'email' },
        });
        const whatsappConnections = yield models_1.default.UserConnection.count({
            where: { user_id: userId, type: 'whatsapp' },
        });
        res.json({
            max_email_connections: plan.max_email_connections || 0,
            max_whatsapp_connections: plan.max_whatsapp_numbers || 0,
            current_email_connections: emailConnections,
            current_whatsapp_connections: whatsappConnections,
        });
    }
    catch (error) {
        console.error('Error fetching plan limits:', error);
        res.status(500).json({ error: 'Failed to fetch plan limits' });
    }
}));
// Create a new connection
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = req.userId;
        const { type, name, config, whatsapp_number, whatsapp_name, whatsapp_status, whatsapp_avatar_url } = req.body;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!type || !name || !config) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // Check plan limits
        const user = yield models_1.default.User.findByPk(userId, {
            include: [
                {
                    model: models_1.default.Company,
                    through: { attributes: [] },
                    include: [{ model: models_1.default.Plan }],
                },
            ],
        });
        const company = (_a = user.Companies) === null || _a === void 0 ? void 0 : _a[0];
        const plan = company === null || company === void 0 ? void 0 : company.Plan;
        if (!plan) {
            return res.status(400).json({ error: 'User has no plan assigned' });
        }
        const currentConnections = yield models_1.default.UserConnection.count({
            where: { user_id: userId, type },
        });
        const maxAllowed = type === 'email'
            ? plan.max_email_connections
            : plan.max_whatsapp_numbers;
        if (currentConnections >= maxAllowed) {
            return res.status(400).json({
                error: `You have reached the maximum limit of ${type} connections (${maxAllowed})`,
            });
        }
        const connection = yield models_1.default.UserConnection.create({
            user_id: userId,
            type,
            name,
            config,
            status: 'active',
            // WhatsApp fields
            whatsapp_number,
            whatsapp_name,
            whatsapp_status,
            whatsapp_avatar_url,
        });
        res.status(201).json({ data: connection });
    }
    catch (error) {
        console.error('Error creating connection:', error);
        res.status(500).json({ error: 'Failed to create connection' });
    }
}));
// Update a connection
router.put('/:connectionId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { connectionId } = req.params;
        const { name, config } = req.body;
        const connection = yield models_1.default.UserConnection.findByPk(connectionId);
        if (!connection) {
            return res.status(404).json({ error: 'Connection not found' });
        }
        if (connection.user_id !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (name)
            connection.name = name;
        if (config)
            connection.config = config;
        yield connection.save();
        res.json({ data: connection });
    }
    catch (error) {
        console.error('Error updating connection:', error);
        res.status(500).json({ error: 'Failed to update connection' });
    }
}));
// Delete a connection
router.delete('/:connectionId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { connectionId } = req.params;
        const connection = yield models_1.default.UserConnection.findByPk(connectionId);
        if (!connection) {
            return res.status(404).json({ error: 'Connection not found' });
        }
        if (connection.user_id !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        yield connection.destroy();
        res.json({ message: 'Connection deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting connection:', error);
        res.status(500).json({ error: 'Failed to delete connection' });
    }
}));
exports.default = router;
