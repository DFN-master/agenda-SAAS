"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activateEmailPolling = activateEmailPolling;
exports.deactivateEmailPolling = deactivateEmailPolling;
exports.getActivePollings = getActivePollings;
exports.isEmailPollingActive = isEmailPollingActive;
const emailAIService_1 = require("./emailAIService");
// Em-memory map de pollings ativos
const activePollings = new Map();
/**
 * Inicia polling de emails para uma conexão
 */
function activateEmailPolling(connectionId, emailConfig) {
    // Se já está ativo, não duplicar
    if (activePollings.has(connectionId)) {
        console.log(`[EMAIL-POLLING] ⚠️ Polling já ativo para ${connectionId}`);
        return;
    }
    console.log(`[EMAIL-POLLING] ✓ Ativando polling para ${connectionId}`);
    const stopPolling = (0, emailAIService_1.startEmailPolling)(connectionId, emailConfig, 60); // 60 segundos
    activePollings.set(connectionId, {
        connectionId,
        stopPolling,
    });
}
/**
 * Para polling de emails para uma conexão
 */
function deactivateEmailPolling(connectionId) {
    const polling = activePollings.get(connectionId);
    if (!polling) {
        console.log(`[EMAIL-POLLING] ⚠️ Polling não encontrado para ${connectionId}`);
        return;
    }
    console.log(`[EMAIL-POLLING] ⏹️ Parando polling para ${connectionId}`);
    polling.stopPolling();
    activePollings.delete(connectionId);
}
/**
 * Lista pollings ativos
 */
function getActivePollings() {
    return Array.from(activePollings.keys());
}
/**
 * Verifica se polling está ativo
 */
function isEmailPollingActive(connectionId) {
    return activePollings.has(connectionId);
}
