import { Boom } from '@hapi/boom';
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';

export const startWhatsAppService = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
  const sock = makeWASocket({ auth: state });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        startWhatsAppService();
      }
    } else if (connection === 'open') {
      console.log('WhatsApp connection established');
    }
  });

  sock.ev.on('messages.upsert', async (message) => {
    console.log('Received message:', message);
    // TODO: Process incoming messages
  });

  sock.ev.on('creds.update', saveCreds);
};