export interface WhatsAppConnection {
    id: string;
    userId: string;
    phoneNumber: string;
    qrCode?: string;
    status: 'disconnected' | 'scanning' | 'connecting' | 'connected';
    socket?: any;
    createdAt: Date;
    userName?: string;
    userStatus?: string;
    userProfilePic?: string;
    userPhone?: string;
    companyId?: string;
    userToken?: string;
}
/**
 * Salva metadados da conexão (userId, companyId, userToken)
 */
declare function saveConnectionMetadata(connectionId: string, metadata: {
    userId?: string;
    companyId?: string;
    userToken?: string;
}): Promise<void>;
/**
 * Cria uma nova conexão WhatsApp e inicia autenticação
 */
export declare function createWhatsAppConnection(userId: string, phoneNumber?: string): Promise<WhatsAppConnection>;
/**
 * Obtém conexão pelo ID
 */
export declare function getConnection(connectionId: string): WhatsAppConnection | undefined;
/**
 * Lista conexões de um usuário
 */
export declare function getUserConnections(userId: string): WhatsAppConnection[];
/**
 * Atualiza status da conexão
 */
export declare function updateConnectionStatus(connectionId: string, status: WhatsAppConnection['status'], qrCode?: string): WhatsAppConnection | undefined;
/**
 * Remove uma conexão
 */
export declare function removeConnection(connectionId: string): Promise<boolean>;
/**
 * Carrega e reconecta todas as conexões salvas
 */
export declare function loadSavedConnections(): Promise<void>;
/**
 * Retorna todas as conexões ativas
 */
export declare function getAllConnections(): WhatsAppConnection[];
/**
 * Exporta função para salvar metadados (usado em rotas)
 */
export { saveConnectionMetadata };
//# sourceMappingURL=types.d.ts.map