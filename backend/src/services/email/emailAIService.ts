import nodemailer from 'nodemailer';
import { simpleParser } from 'mailparser';
import imap from 'imap';
import fetch from 'node-fetch';
import models from '../../models';

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Envia email recebido para backend processar IA
 */
async function sendEmailToAIBackend(
  userConnectionId: string,
  user: any,
  fromEmail: string,
  emailSubject: string,
  emailBody: string
) {
  if (!user?.id || !user.Companies?.[0]?.id) {
    console.log(
      `[EMAIL-AI] ⚠️ Falta userId ou companyId para conexão ${userConnectionId}`
    );
    return;
  }

  const companyId = user.Companies[0].id;
  const userId = user.id;

  try {
    console.log(`[EMAIL-AI] 📤 Enviando email para AI backend...`);
    console.log(
      `   Conexão: ${userConnectionId}, De: ${fromEmail}, Assunto: "${emailSubject.substring(0, 50)}..."`
    );

    const payload = {
      company_id: companyId,
      connection_id: userConnectionId,
      client_ref: fromEmail,
      incoming_message: `Assunto: ${emailSubject}\n\n${emailBody}`,
    };

    const response = await fetch('http://localhost:3000/api/ai/suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SERVICE_TOKEN || 'system'}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = (await response.json()) as any;
      console.log(`[EMAIL-AI] ✅ Sugestão criada com ID: ${data.data?.id}`);
      console.log(`   Confiança: ${(data.data?.confidence_score * 100).toFixed(1)}%`);
    } else {
      const error = await response.text();
      console.error(`[EMAIL-AI] ❌ Erro do backend (${response.status}):`, error);
    }
  } catch (error) {
    console.error(`[EMAIL-AI] ❌ Erro ao enviar para AI backend:`, error);
  }
}

/**
 * Processa emails recebidos para uma conexão específica
 */
export async function processEmailsForConnection(
  connectionId: string,
  emailConfig: {
    email: string;
    password: string;
    imapHost: string;
    imapPort: number;
    imapTls: boolean;
  }
) {
  const imapConfig = {
    user: emailConfig.email,
    password: emailConfig.password,
    host: emailConfig.imapHost,
    port: emailConfig.imapPort,
    tls: emailConfig.imapTls,
  };

  const imapClient = new imap(imapConfig);

  imapClient.once('ready', () => {
    imapClient.openBox('INBOX', false, async (err, box) => {
      if (err) {
        console.error(`[EMAIL-AI] IMAP error opening inbox:`, err);
        imapClient.end();
        return;
      }

      imapClient.search(['UNSEEN'], async (err, results) => {
        if (err) {
          console.error(`[EMAIL-AI] IMAP search error:`, err);
          imapClient.end();
          return;
        }

        if (!results || results.length === 0) {
          console.log(`[EMAIL-AI] ✓ Nenhum email não lido`);
          imapClient.end();
          return;
        }

        console.log(`[EMAIL-AI] 📧 ${results.length} email(s) não lido(s) encontrado(s)`);

        const fetch = imapClient.fetch(results, { bodies: '' });

        fetch.on('message', (msg) => {
          msg.on('body', async (stream) => {
            try {
              const parsed = await simpleParser(stream);

              console.log(`[EMAIL-AI] 📨 Email recebido:`);
              console.log(
                `   De: ${parsed.from?.text}, Assunto: "${parsed.subject?.substring(0, 50)}..."`
              );

              // Buscar conexão e usuário
              const connection = await (models as any).UserConnection.findByPk(
                connectionId
              );
              const user = connection
                ? await (models as any).User.findByPk(connection.user_id, {
                    include: [
                      {
                        model: (models as any).Company,
                        through: { attributes: [] },
                      },
                    ],
                  })
                : null;

              if (!connection || !user) {
                console.error(`[EMAIL-AI] Conexão ou usuário não encontrado`);
                return;
              }

              // Enviar para IA
              const fromEmail = parsed.from?.text || 'unknown';
              const subject = parsed.subject || 'Sem assunto';
              const text = parsed.text || parsed.html || '';

              await sendEmailToAIBackend(
                connectionId,
                user,
                fromEmail,
                subject,
                text
              );
            } catch (error) {
              console.error(`[EMAIL-AI] Erro ao processar email:`, error);
            }
          });
        });

        fetch.once('end', () => {
          console.log(`[EMAIL-AI] ✓ Processamento concluído`);
          imapClient.end();
        });
      });
    });
  });

  imapClient.once('error', (err) => {
    console.error(`[EMAIL-AI] IMAP error:`, err);
  });

  imapClient.once('end', () => {
    console.log(`[EMAIL-AI] Conexão IMAP finalizada`);
  });

  imapClient.connect();
}

/**
 * Inicia polling de emails a cada X segundos
 */
export function startEmailPolling(
  connectionId: string,
  emailConfig: {
    email: string;
    password: string;
    imapHost: string;
    imapPort: number;
    imapTls: boolean;
  },
  pollIntervalSeconds = 60
) {
  console.log(
    `[EMAIL-AI] 🔄 Iniciando polling de emails a cada ${pollIntervalSeconds}s`
  );

  // Processa logo na primeira vez
  processEmailsForConnection(connectionId, emailConfig);

  // Depois em intervalo
  const interval = setInterval(() => {
    processEmailsForConnection(connectionId, emailConfig);
  }, pollIntervalSeconds * 1000);

  return () => clearInterval(interval);
}

/**
 * Envia resposta por email
 */
export async function sendEmailResponse(
  toEmail: string,
  subject: string,
  body: string
): Promise<boolean> {
  try {
    const transporter = createTransporter();

    const messageId = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: `Re: ${subject}`,
      text: body,
    });

    console.log(`[EMAIL-AI] 📧 Email enviado para ${toEmail}, ID: ${messageId}`);
    return true;
  } catch (error) {
    console.error(`[EMAIL-AI] ❌ Erro ao enviar email:`, error);
    return false;
  }
}
