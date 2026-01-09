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
exports.sendTextMessage = sendTextMessage;
exports.ensureWhatsMeowConnections = ensureWhatsMeowConnections;
const node_fetch_1 = __importDefault(require("node-fetch"));
function getBaseUrl() {
    return process.env.WHATSAPP_SERVICE_URL || 'http://localhost:4000';
}
/**
 * Envia mensagem de texto via serviço WhatsMeow externo
 */
function sendTextMessage(connectionId, jid, message) {
    return __awaiter(this, void 0, void 0, function* () {
        const base = getBaseUrl();
        const url = `${base}/whatsapp/connections/${connectionId}/send-message`;
        const res = yield (0, node_fetch_1.default)(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jid, message }),
        });
        if (!res.ok) {
            throw new Error(`WhatsApp send failed: ${res.status}`);
        }
        return true;
    });
}
/**
 * Verifica se o serviço WhatsMeow está ativo.
 */
function isWhatsMeowServiceAvailable() {
    return __awaiter(this, void 0, void 0, function* () {
        const base = getBaseUrl();
        const url = `${base}/health`;
        try {
            const res = yield (0, node_fetch_1.default)(url);
            return res.ok;
        }
        catch (error) {
            console.error('Erro ao verificar o serviço WhatsMeow:', error);
            return false;
        }
    });
}
/**
 * Reconnects WhatsMeow to all registered numbers on service startup.
 */
function ensureWhatsMeowConnections() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(yield isWhatsMeowServiceAvailable())) {
            console.error('O serviço WhatsMeow não está disponível. Verifique se ele está em execução.');
            return;
        }
        const base = getBaseUrl();
        const url = `${base}/whatsapp/connections/reconnect-all`;
        try {
            const res = yield (0, node_fetch_1.default)(url, { method: 'POST' });
            if (!res.ok) {
                const errorBody = yield res.text();
                console.error(`Falha ao reconectar conexões do WhatsMeow: ${res.status}`);
                console.error(`URL chamada: ${url}`);
                console.error(`Resposta do serviço: ${errorBody}`);
            }
            else {
                console.log('Conexões do WhatsMeow reconectadas com sucesso.');
            }
        }
        catch (error) {
            console.error('Erro ao reconectar conexões do WhatsMeow:', error);
        }
    });
}
