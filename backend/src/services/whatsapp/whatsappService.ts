import fetch from 'node-fetch';

function getBaseUrl() {
  return process.env.WHATSAPP_SERVICE_URL || 'http://localhost:4000';
}

/**
 * Envia mensagem de texto via serviço WhatsMeow externo
 */
export async function sendTextMessage(connectionId: string, jid: string, message: string) {
  const base = getBaseUrl();
  const url = `${base}/whatsapp/connections/${connectionId}/send-message`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jid, message }),
  });
  if (!res.ok) {
    throw new Error(`WhatsApp send failed: ${res.status}`);
  }
  return true;
}

/**
 * Verifica se o serviço WhatsMeow está ativo.
 */
async function isWhatsMeowServiceAvailable() {
  const base = getBaseUrl();
  const url = `${base}/health`;
  try {
    const res = await fetch(url);
    return res.ok;
  } catch (error) {
    console.error('Erro ao verificar o serviço WhatsMeow:', error);
    return false;
  }
}

/**
 * Reconnects WhatsMeow to all registered numbers on service startup.
 */
export async function ensureWhatsMeowConnections() {
  if (!(await isWhatsMeowServiceAvailable())) {
    console.error('O serviço WhatsMeow não está disponível. Verifique se ele está em execução.');
    return;
  }

  const base = getBaseUrl();
  const url = `${base}/whatsapp/connections/reconnect-all`;
  try {
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`Falha ao reconectar conexões do WhatsMeow: ${res.status}`);
      console.error(`URL chamada: ${url}`);
      console.error(`Resposta do serviço: ${errorBody}`);
    } else {
      console.log('Conexões do WhatsMeow reconectadas com sucesso.');
    }
  } catch (error) {
    console.error('Erro ao reconectar conexões do WhatsMeow:', error);
  }
}