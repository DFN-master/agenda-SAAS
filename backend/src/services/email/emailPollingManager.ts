import { startEmailPolling } from './emailAIService';

interface ActiveEmailPolling {
  connectionId: string;
  stopPolling: () => void;
}

// Em-memory map de pollings ativos
const activePollings = new Map<string, ActiveEmailPolling>();

/**
 * Inicia polling de emails para uma conexão
 */
export function activateEmailPolling(
  connectionId: string,
  emailConfig: {
    email: string;
    password: string;
    imapHost: string;
    imapPort: number;
    imapTls: boolean;
  }
) {
  // Se já está ativo, não duplicar
  if (activePollings.has(connectionId)) {
    console.log(`[EMAIL-POLLING] ⚠️ Polling já ativo para ${connectionId}`);
    return;
  }

  console.log(`[EMAIL-POLLING] ✓ Ativando polling para ${connectionId}`);

  const stopPolling = startEmailPolling(connectionId, emailConfig, 60); // 60 segundos

  activePollings.set(connectionId, {
    connectionId,
    stopPolling,
  });
}

/**
 * Para polling de emails para uma conexão
 */
export function deactivateEmailPolling(connectionId: string) {
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
export function getActivePollings(): string[] {
  return Array.from(activePollings.keys());
}

/**
 * Verifica se polling está ativo
 */
export function isEmailPollingActive(connectionId: string): boolean {
  return activePollings.has(connectionId);
}
