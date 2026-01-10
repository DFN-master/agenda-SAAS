"use strict";
/**
 * Types simplificados para whatsapp-service (apenas wrapper)
 * A implementação real está no serviço Whatsmeow em Go
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheConnection = cacheConnection;
exports.getCachedConnection = getCachedConnection;
exports.removeCachedConnection = removeCachedConnection;
exports.getAllCachedConnections = getAllCachedConnections;
exports.loadSavedConnections = loadSavedConnections;
exports.createWhatsAppConnection = createWhatsAppConnection;
exports.getConnection = getConnection;
exports.getAllConnections = getAllConnections;
exports.updateConnectionStatus = updateConnectionStatus;
exports.removeConnection = removeConnection;
// Cache em memória de conexões
const connectionCache = new Map();
function cacheConnection(conn) {
    connectionCache.set(conn.id, conn);
}
function getCachedConnection(id) {
    return connectionCache.get(id);
}
function removeCachedConnection(id) {
    connectionCache.delete(id);
}
function getAllCachedConnections() {
    return Array.from(connectionCache.values());
}
async function loadSavedConnections() {
    // Implementação no Go (whatsmeow-service)
    console.log('[TypeScript] Carregando conexões salvas do serviço Whatsmeow');
    return Promise.resolve();
}
async function createWhatsAppConnection(userId, phoneNumber) {
    return {
        id: `conn_${Date.now()}`,
        userId,
        phoneNumber: phoneNumber || '',
        status: 'scanning',
        createdAt: new Date(),
    };
}
function getConnection(id) {
    return getCachedConnection(id);
}
function getAllConnections() {
    return getAllCachedConnections();
}
async function updateConnectionStatus(id, status) {
    const conn = getCachedConnection(id);
    if (conn) {
        conn.status = status;
    }
}
async function removeConnection(id) {
    removeCachedConnection(id);
    return true;
}
//# sourceMappingURL=types.js.map