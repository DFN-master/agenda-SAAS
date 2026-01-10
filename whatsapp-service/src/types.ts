/**
 * Types simplificados para whatsapp-service (apenas wrapper)
 * A implementação real está no serviço Whatsmeow em Go
 */

export interface WhatsAppConnection {
  id: string;
  connectionId: string;
  status: 'disconnected' | 'scanning' | 'connecting' | 'connected';
  jid?: string;
  companyId?: string;
  userId?: string;
  createdAt: Date;
}

// Cache em memória de conexões
const connectionCache = new Map<string, WhatsAppConnection>();

export function cacheConnection(conn: WhatsAppConnection) {
  connectionCache.set(conn.id, conn);
}

export function getCachedConnection(id: string): WhatsAppConnection | undefined {
  return connectionCache.get(id);
}

export function removeCachedConnection(id: string) {
  connectionCache.delete(id);
}

export function getAllCachedConnections(): WhatsAppConnection[] {
  return Array.from(connectionCache.values());
}

export async function loadSavedConnections() {
  // Implementação no Go (whatsmeow-service)
  console.log('[TypeScript] Carregando conexões salvas do serviço Whatsmeow');
  return Promise.resolve();
}

export async function createWhatsAppConnection(userId: string, phoneNumber?: string) {
  return {
    id: `conn_${Date.now()}`,
    userId,
    phoneNumber: phoneNumber || '',
    status: 'scanning',
    createdAt: new Date(),
  };
}

export function getConnection(id: string) {
  return getCachedConnection(id);
}

export function getAllConnections() {
  return getAllCachedConnections();
}

export async function updateConnectionStatus(id: string, status: string) {
  const conn = getCachedConnection(id);
  if (conn) {
    conn.status = status as any;
  }
}

export async function removeConnection(id: string) {
  removeCachedConnection(id);
  return true;
}
