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
const emailPollingManager_1 = require("../services/email/emailPollingManager");
const models_1 = __importDefault(require("../models"));
const router = express_1.default.Router();
/**
 * POST /email/polling/:connectionId/start
 * Inicia polling de emails para uma conexão
 */
router.post('/polling/:connectionId/start', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { connectionId } = req.params;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Verificar se conexão pertence ao usuário e é do tipo email
        const connection = yield models_1.default.UserConnection.findByPk(connectionId);
        if (!connection || connection.user_id !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (connection.type !== 'email') {
            return res
                .status(400)
                .json({ error: 'Connection is not of type email' });
        }
        // Verificar se polling já está ativo
        if ((0, emailPollingManager_1.isEmailPollingActive)(connectionId)) {
            return res.status(400).json({ error: 'Polling already active' });
        }
        // Obter configuração de email
        const emailConfig = connection.config;
        if (!emailConfig || !emailConfig.email || !emailConfig.password) {
            return res.status(400).json({ error: 'Invalid email configuration' });
        }
        // Ativar polling
        (0, emailPollingManager_1.activateEmailPolling)(connectionId, {
            email: emailConfig.email,
            password: emailConfig.password,
            imapHost: emailConfig.imap_host,
            imapPort: emailConfig.imap_port,
            imapTls: emailConfig.imap_tls,
        });
        res.json({
            success: true,
            message: 'Email polling started',
            connectionId,
        });
    }
    catch (error) {
        console.error('Error starting email polling:', error);
        res.status(500).json({ error: 'Failed to start email polling' });
    }
}));
/**
 * POST /email/polling/:connectionId/stop
 * Para polling de emails para uma conexão
 */
router.post('/polling/:connectionId/stop', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { connectionId } = req.params;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Verificar se conexão pertence ao usuário
        const connection = yield models_1.default.UserConnection.findByPk(connectionId);
        if (!connection || connection.user_id !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        // Parar polling
        (0, emailPollingManager_1.deactivateEmailPolling)(connectionId);
        res.json({
            success: true,
            message: 'Email polling stopped',
            connectionId,
        });
    }
    catch (error) {
        console.error('Error stopping email polling:', error);
        res.status(500).json({ error: 'Failed to stop email polling' });
    }
}));
/**
 * GET /email/polling/:connectionId/status
 * Verifica se polling está ativo
 */
router.get('/polling/:connectionId/status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { connectionId } = req.params;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Verificar se conexão pertence ao usuário
        const connection = yield models_1.default.UserConnection.findByPk(connectionId);
        if (!connection || connection.user_id !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const active = (0, emailPollingManager_1.isEmailPollingActive)(connectionId);
        res.json({
            connectionId,
            polling_active: active,
        });
    }
    catch (error) {
        console.error('Error checking email polling status:', error);
        res.status(500).json({ error: 'Failed to check polling status' });
    }
}));
exports.default = router;
