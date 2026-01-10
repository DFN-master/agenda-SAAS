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
export declare function cacheConnection(conn: WhatsAppConnection): void;
export declare function getCachedConnection(id: string): WhatsAppConnection | undefined;
export declare function removeCachedConnection(id: string): void;
export declare function getAllCachedConnections(): WhatsAppConnection[];
export declare function loadSavedConnections(): Promise<void>;
export declare function createWhatsAppConnection(userId: string, phoneNumber?: string): Promise<{
    id: string;
    userId: string;
    phoneNumber: string;
    status: string;
    createdAt: Date;
}>;
export declare function getConnection(id: string): WhatsAppConnection | undefined;
export declare function getAllConnections(): WhatsAppConnection[];
export declare function updateConnectionStatus(id: string, status: string): Promise<void>;
export declare function removeConnection(id: string): Promise<boolean>;
//# sourceMappingURL=types.d.ts.map