"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiveEmails = exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const mailparser_1 = require("mailparser");
const imap_1 = __importDefault(require("imap"));
const createTransporter = () => {
    return nodemailer_1.default.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT),
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};
const sendEmail = (to, subject, text) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const transporter = createTransporter();
        const info = yield transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to,
            subject,
            text,
        });
        console.log('Email sent:', info.messageId);
    }
    catch (error) {
        console.error('Error sending email:', error);
    }
});
exports.sendEmail = sendEmail;
const receiveEmails = () => __awaiter(void 0, void 0, void 0, function* () {
    const imapConfig = {
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASS,
        host: process.env.IMAP_HOST,
        port: Number(process.env.IMAP_PORT),
        tls: process.env.IMAP_TLS === 'true',
    };
    const imapClient = new imap_1.default(imapConfig);
    imapClient.once('ready', () => {
        imapClient.openBox('INBOX', false, (err, box) => {
            if (err)
                throw err;
            imapClient.search(['UNSEEN'], (err, results) => {
                if (err)
                    throw err;
                const fetch = imapClient.fetch(results, { bodies: '' });
                fetch.on('message', (msg) => {
                    msg.on('body', (stream) => {
                        (0, mailparser_1.simpleParser)(stream, (err, parsed) => {
                            if (err)
                                console.error('Error parsing email:', err);
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
});
exports.receiveEmails = receiveEmails;
