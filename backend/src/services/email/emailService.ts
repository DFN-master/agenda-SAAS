import nodemailer from 'nodemailer';
import { simpleParser } from 'mailparser';
import imap from 'imap';

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

export const sendEmail = async (to: string, subject: string, text: string) => {
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text,
    });
    console.log('Email sent:', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

export const receiveEmails = async () => {
  const imapConfig = {
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASS,
    host: process.env.IMAP_HOST,
    port: Number(process.env.IMAP_PORT),
    tls: process.env.IMAP_TLS === 'true',
  };

  const imapClient = new imap(imapConfig);

  imapClient.once('ready', () => {
    imapClient.openBox('INBOX', false, (err, box) => {
      if (err) throw err;
      imapClient.search(['UNSEEN'], (err, results) => {
        if (err) throw err;
        const fetch = imapClient.fetch(results, { bodies: '' });
        fetch.on('message', (msg) => {
          msg.on('body', (stream) => {
            simpleParser(stream, (err, parsed) => {
              if (err) console.error('Error parsing email:', err);
              console.log('Parsed email:', parsed);
              // TODO: Process parsed email
            });
          });
        });
        fetch.once('end', () => {
          console.log('Done fetching emails');
          imapClient.end();
        });
      });
    });
  });

  imapClient.once('error', (err) => {
    console.error('IMAP error:', err);
  });

  imapClient.connect();
};