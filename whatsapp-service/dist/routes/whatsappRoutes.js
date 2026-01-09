"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const types_1 = require("../types");
const router = express_1.default.Router();
/**
 * POST /whatsapp/connections
 * Cria uma nova conexão WhatsApp e retorna conexion ID para polling do QR code
 */
router.post('/connections', async (req, res) => {
    try {
        const { userId, phoneNumber, companyId, userToken } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'userId é obrigatório' });
        }
        if (!companyId) {
            return res.status(400).json({ error: 'companyId é obrigatório' });
        }
        console.log(`Criando conexão WhatsApp para usuário: ${userId}, empresa: ${companyId}`);
        const connection = await (0, types_1.createWhatsAppConnection)(userId, phoneNumber);
        // Adicionar companyId e userToken para webhook de IA
        connection.companyId = companyId;
        connection.userToken = userToken;
        // Salvar metadados para persistência
        const { saveConnectionMetadata } = require('../types');
        await saveConnectionMetadata(connection.id, { userId, companyId, userToken });
        console.log(`Conexão criada: ${connection.id}`);
        res.status(201).json({
            connectionId: connection.id,
            status: connection.status,
            message: 'Escaneie o QR code com seu WhatsApp',
        });
    }
    catch (error) {
        console.error('Error creating connection:', error);
        res.status(500).json({ error: 'Falha ao criar conexão' });
    }
});
/**
 * GET /whatsapp/connections/:connectionId/qr
 * Obtém o QR code para autenticação
 */
router.get('/connections/:connectionId/qr', async (req, res) => {
    try {
        const { connectionId } = req.params;
        console.log(`GET QR code para: ${connectionId}`);
        const connection = (0, types_1.getConnection)(connectionId);
        if (!connection) {
            console.log(`Conexão não encontrada: ${connectionId}`);
            return res.status(404).json({ error: 'Conexão não encontrada' });
        }
        console.log(`Status da conexão: ${connection.status}, QR Code presente: ${!!connection.qrCode}`);
        // Se já conectado, devolve os dados mesmo sem QR code
        if (connection.status === 'connected') {
            return res.json({
                status: connection.status,
                userName: connection.userName,
                userStatus: connection.userStatus,
                userProfilePic: connection.userProfilePic,
                userPhone: connection.userPhone,
            });
        }
        if (!connection.qrCode) {
            return res.status(202).json({
                status: connection.status,
                message: 'QR code não está pronto, tente novamente em alguns segundos',
            });
        }
        res.json({
            status: connection.status,
            qrCode: connection.qrCode,
        });
    }
    catch (error) {
        console.error('Error getting QR code:', error);
        res.status(500).json({ error: 'Falha ao obter QR code' });
    }
});
/**
 * GET /whatsapp/connections/:connectionId/status
 * Obtém status completo da conexão incluindo dados do usuário
 */
router.get('/connections/:connectionId/status', (req, res) => {
    try {
        const { connectionId } = req.params;
        const connection = (0, types_1.getConnection)(connectionId);
        if (!connection) {
            return res.status(404).json({ error: 'Conexão não encontrada' });
        }
        res.json({
            connectionId: connection.id,
            status: connection.status,
            phoneNumber: connection.phoneNumber,
            userName: connection.userName,
            userStatus: connection.userStatus,
            userProfilePic: connection.userProfilePic,
            userPhone: connection.userPhone,
        });
    }
    catch (error) {
        console.error('Error getting status:', error);
        res.status(500).json({ error: 'Falha ao obter status' });
    }
});
/**
 * DELETE /whatsapp/connections/:connectionId
 * Desconecta e remove a conexão
 */
router.delete('/connections/:connectionId', async (req, res) => {
    try {
        const { connectionId } = req.params;
        const removed = await (0, types_1.removeConnection)(connectionId);
        if (!removed) {
            return res.status(404).json({ error: 'Conexão não encontrada' });
        }
        res.json({ message: 'Conexão removida com sucesso' });
    }
    catch (error) {
        console.error('Error removing connection:', error);
        res.status(500).json({ error: 'Falha ao remover conexão' });
    }
});
/**
 * POST /whatsapp/connections/reconnect-all
 * Força reconexão de todas as conexões WhatsApp salvas
 */
router.post('/connections/reconnect-all', async (req, res) => {
    try {
        const { loadSavedConnections, getAllConnections } = require('../types');
        await loadSavedConnections();
        const connections = getAllConnections();
        res.json({
            success: true,
            message: 'Reconexão iniciada para todas as conexões salvas',
            connectionsCount: connections.length,
            connections: connections.map((c) => ({
                id: c.id,
                status: c.status,
                phoneNumber: c.phoneNumber,
                userName: c.userName,
            })),
        });
    }
    catch (error) {
        console.error('Error reconnecting all connections:', error);
        res.status(500).json({ error: 'Falha ao reconectar conexões' });
    }
});
/**
 * POST /whatsapp/connections/:connectionId/send-message
 * Envia uma mensagem via conexão WhatsApp
 */
router.post('/connections/:connectionId/send-message', async (req, res) => {
    try {
        const { connectionId } = req.params;
        const { jid, message } = req.body;
        if (!jid || !message) {
            return res.status(400).json({ error: 'jid e message são obrigatórios' });
        }
        const connection = (0, types_1.getConnection)(connectionId);
        if (!connection) {
            return res.status(404).json({ error: 'Conexão não encontrada' });
        }
        if (connection.status !== 'connected' || !connection.socket) {
            return res.status(503).json({ error: 'Conexão WhatsApp não está ativa' });
        }
        try {
            await connection.socket.sendMessage(jid, { text: message });
            console.log(`[${new Date().toISOString()}] 📤 Mensagem enviada para ${jid}: "${message.substring(0, 50)}..."`);
            res.json({ success: true, message: 'Mensagem enviada' });
        }
        catch (error) {
            console.error(`Erro ao enviar mensagem:`, error);
            res.status(500).json({ error: 'Falha ao enviar mensagem via WhatsApp' });
        }
    }
    catch (error) {
        console.error('Error in send-message endpoint:', error);
        res.status(500).json({ error: 'Erro interno ao processar requisição' });
    }
});
exports.default = router;
//# sourceMappingURL=whatsappRoutes.js.map