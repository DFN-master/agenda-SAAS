/**
 * Serviço de Notificações WhatsApp
 * Envia notificações automáticas via WhatsApp para clientes
 */
import { sendTextMessage } from './whatsappService';
import models from '../../models';

/**
 * Formata número de telefone para JID do WhatsApp
 * Exemplo: (11) 98765-4321 → 5511987654321@s.whatsapp.net
 */
export function formatPhoneToJid(phone: string): string {
  // Remove todos os caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '');
  
  // Se não começar com código do país, adiciona 55 (Brasil)
  const withCountryCode = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
  
  // Adiciona sufixo do WhatsApp
  return `${withCountryCode}@s.whatsapp.net`;
}

/**
 * Envia uma notificação de lembrete de agendamento
 */
export async function sendAppointmentReminder(
  connectionId: string,
  clientPhone: string,
  appointmentData: {
    clientName: string;
    date: string;
    time: string;
    service?: string;
    location?: string;
  }
): Promise<boolean> {
  try {
    const jid = formatPhoneToJid(clientPhone);
    
    let message = `Olá ${appointmentData.clientName}! 👋\n\n`;
    message += `🗓️ *Lembrete de Agendamento*\n\n`;
    message += `📅 Data: ${appointmentData.date}\n`;
    message += `🕐 Horário: ${appointmentData.time}\n`;
    
    if (appointmentData.service) {
      message += `📋 Serviço: ${appointmentData.service}\n`;
    }
    
    if (appointmentData.location) {
      message += `📍 Local: ${appointmentData.location}\n`;
    }
    
    message += `\nAguardamos você! 😊\n`;
    message += `\nPara reagendar ou cancelar, responda esta mensagem.`;
    
    await sendTextMessage(connectionId, jid, message);
    
    console.log(`[WhatsApp] Lembrete enviado para ${clientPhone}`);
    return true;
  } catch (error) {
    console.error(`[WhatsApp] Erro ao enviar lembrete:`, error);
    return false;
  }
}

/**
 * Envia confirmação de agendamento
 */
export async function sendAppointmentConfirmation(
  connectionId: string,
  clientPhone: string,
  appointmentData: {
    clientName: string;
    date: string;
    time: string;
    service?: string;
    confirmationCode?: string;
  }
): Promise<boolean> {
  try {
    const jid = formatPhoneToJid(clientPhone);
    
    let message = `Olá ${appointmentData.clientName}! 👋\n\n`;
    message += `✅ *Agendamento Confirmado*\n\n`;
    message += `📅 Data: ${appointmentData.date}\n`;
    message += `🕐 Horário: ${appointmentData.time}\n`;
    
    if (appointmentData.service) {
      message += `📋 Serviço: ${appointmentData.service}\n`;
    }
    
    if (appointmentData.confirmationCode) {
      message += `\n🔑 Código de Confirmação: *${appointmentData.confirmationCode}*\n`;
    }
    
    message += `\nObrigado pela preferência! 😊`;
    
    await sendTextMessage(connectionId, jid, message);
    
    console.log(`[WhatsApp] Confirmação enviada para ${clientPhone}`);
    return true;
  } catch (error) {
    console.error(`[WhatsApp] Erro ao enviar confirmação:`, error);
    return false;
  }
}

/**
 * Envia notificação de cancelamento
 */
export async function sendAppointmentCancellation(
  connectionId: string,
  clientPhone: string,
  appointmentData: {
    clientName: string;
    date: string;
    time: string;
    reason?: string;
  }
): Promise<boolean> {
  try {
    const jid = formatPhoneToJid(clientPhone);
    
    let message = `Olá ${appointmentData.clientName}! 👋\n\n`;
    message += `❌ *Agendamento Cancelado*\n\n`;
    message += `📅 Data: ${appointmentData.date}\n`;
    message += `🕐 Horário: ${appointmentData.time}\n`;
    
    if (appointmentData.reason) {
      message += `\n📝 Motivo: ${appointmentData.reason}\n`;
    }
    
    message += `\nDeseja reagendar? Responda esta mensagem! 😊`;
    
    await sendTextMessage(connectionId, jid, message);
    
    console.log(`[WhatsApp] Cancelamento enviado para ${clientPhone}`);
    return true;
  } catch (error) {
    console.error(`[WhatsApp] Erro ao enviar cancelamento:`, error);
    return false;
  }
}

/**
 * Envia mensagem personalizada
 */
export async function sendCustomMessage(
  connectionId: string,
  clientPhone: string,
  message: string
): Promise<boolean> {
  try {
    const jid = formatPhoneToJid(clientPhone);
    await sendTextMessage(connectionId, jid, message);
    
    console.log(`[WhatsApp] Mensagem personalizada enviada para ${clientPhone}`);
    return true;
  } catch (error) {
    console.error(`[WhatsApp] Erro ao enviar mensagem:`, error);
    return false;
  }
}

/**
 * Busca o connectionId ativo de uma empresa
 */
export async function getActiveConnectionId(companyId: string): Promise<string | null> {
  try {
    const connection = await (models as any).UserConnection.findOne({
      where: {
        company_id: companyId,
        status: 'active',
      },
      order: [['created_at', 'DESC']],
    });
    
    if (!connection) {
      console.error(`[WhatsApp] Nenhuma conexão ativa encontrada para empresa ${companyId}`);
      return null;
    }
    
    return connection.connection_id;
  } catch (error) {
    console.error(`[WhatsApp] Erro ao buscar conexão ativa:`, error);
    return null;
  }
}

/**
 * Envia lembrete automático de agendamento (busca connectionId automaticamente)
 */
export async function sendAutoAppointmentReminder(
  companyId: string,
  clientPhone: string,
  appointmentData: {
    clientName: string;
    date: string;
    time: string;
    service?: string;
    location?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const connectionId = await getActiveConnectionId(companyId);
    
    if (!connectionId) {
      return {
        success: false,
        error: 'Nenhuma conexão WhatsApp ativa encontrada para esta empresa',
      };
    }
    
    const sent = await sendAppointmentReminder(connectionId, clientPhone, appointmentData);
    
    return {
      success: sent,
      error: sent ? undefined : 'Falha ao enviar mensagem',
    };
  } catch (error) {
    console.error(`[WhatsApp] Erro ao enviar lembrete automático:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}
