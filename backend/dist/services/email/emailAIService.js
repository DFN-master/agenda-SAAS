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
exports.processEmailsForConnection = processEmailsForConnection;
exports.startEmailPolling = startEmailPolling;
exports.sendEmailResponse = sendEmailResponse;
const nodemailer_1 = __importDefault(require("nodemailer"));
const mailparser_1 = require("mailparser");
const imap_1 = __importDefault(require("imap"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const models_1 = __importDefault(require("../../models"));
const createTransporter = () => {
    return nodemailer_1.default.createTransport({
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
function sendEmailToAIBackend(userConnectionId, user, fromEmail, emailSubject, emailBody) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        if (!(user === null || user === void 0 ? void 0 : user.id) || !((_b = (_a = user.Companies) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.id)) {
            console.log(`[EMAIL-AI] ⚠️ Falta userId ou companyId para conexão ${userConnectionId}`);
            return;
        }
        const companyId = user.Companies[0].id;
        const userId = user.id;
        try {
            console.log(`[EMAIL-AI] 📤 Enviando email para AI backend...`);
            console.log(`   Conexão: ${userConnectionId}, De: ${fromEmail}, Assunto: "${emailSubject.substring(0, 50)}..."`);
            const payload = {
                company_id: companyId,
                connection_id: userConnectionId,
                client_ref: fromEmail,
                incoming_message: `Assunto: ${emailSubject}\n\n${emailBody}`,
            };
            const response = yield (0, node_fetch_1.default)('http://localhost:3000/api/ai/suggestions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.SERVICE_TOKEN || 'system'}`,
                },
                body: JSON.stringify(payload),
            });
            if (response.ok) {
                const data = (yield response.json());
                console.log(`[EMAIL-AI] ✅ Sugestão criada com ID: ${(_c = data.data) === null || _c === void 0 ? void 0 : _c.id}`);
                console.log(`   Confiança: ${(((_d = data.data) === null || _d === void 0 ? void 0 : _d.confidence_score) * 100).toFixed(1)}%`);
            }
            else {
                const error = yield response.text();
                console.error(`[EMAIL-AI] ❌ Erro do backend (${response.status}):`, error);
            }
        }
        catch (error) {
            console.error(`[EMAIL-AI] ❌ Erro ao enviar para AI backend:`, error);
        }
    });
}
/**
 * Processa emails recebidos para uma conexão específica
 */
function processEmailsForConnection(connectionId, emailConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        const imapConfig = {
            user: emailConfig.email,
            password: emailConfig.password,
            host: emailConfig.imapHost,
            port: emailConfig.imapPort,
            tls: emailConfig.imapTls,
        };
        const imapClient = new imap_1.default(imapConfig);
        imapClient.once('ready', () => {
            imapClient.openBox('INBOX', false, (err, box) => __awaiter(this, void 0, void 0, function* () {
                if (err) {
                    console.error(`[EMAIL-AI] IMAP error opening inbox:`, err);
                    imapClient.end();
                    return;
                }
                imapClient.search(['UNSEEN'], (err, results) => __awaiter(this, void 0, void 0, function* () {
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
                        msg.on('body', (stream) => __awaiter(this, void 0, void 0, function* () {
                            var _a, _b, _c;
                            try {
                                const parsed = yield (0, mailparser_1.simpleParser)(stream);
                                console.log(`[EMAIL-AI] 📨 Email recebido:`);
                                console.log(`   De: ${(_a = parsed.from) === null || _a === void 0 ? void 0 : _a.text}, Assunto: "${(_b = parsed.subject) === null || _b === void 0 ? void 0 : _b.substring(0, 50)}..."`);
                                // Buscar conexão e usuário
                                const connection = yield models_1.default.UserConnection.findByPk(connectionId);
                                const user = connection
                                    ? yield models_1.default.User.findByPk(connection.user_id, {
                                        include: [
                                            {
                                                model: models_1.default.Company,
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
                                const fromEmail = ((_c = parsed.from) === null || _c === void 0 ? void 0 : _c.text) || 'unknown';
                                const subject = parsed.subject || 'Sem assunto';
                                const text = parsed.text || parsed.html || '';
                                yield sendEmailToAIBackend(connectionId, user, fromEmail, subject, text);
                            }
                            catch (error) {
                                console.error(`[EMAIL-AI] Erro ao processar email:`, error);
                            }
                        }));
                    });
                    fetch.once('end', () => {
                        console.log(`[EMAIL-AI] ✓ Processamento concluído`);
                        imapClient.end();
                    });
                }));
            }));
        });
        imapClient.once('error', (err) => {
            console.error(`[EMAIL-AI] IMAP error:`, err);
        });
        imapClient.once('end', () => {
            console.log(`[EMAIL-AI] Conexão IMAP finalizada`);
        });
        imapClient.connect();
    });
}
/**
 * Inicia polling de emails a cada X segundos
 */
function startEmailPolling(connectionId, emailConfig, pollIntervalSeconds = 60) {
    console.log(`[EMAIL-AI] 🔄 Iniciando polling de emails a cada ${pollIntervalSeconds}s`);
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
function sendEmailResponse(toEmail, subject, body) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const transporter = createTransporter();
            const messageId = yield transporter.sendMail({
                from: process.env.EMAIL_FROM,
                to: toEmail,
                subject: `Re: ${subject}`,
                text: body,
            });
            console.log(`[EMAIL-AI] 📧 Email enviado para ${toEmail}, ID: ${messageId}`);
            return true;
        }
        catch (error) {
            console.error(`[EMAIL-AI] ❌ Erro ao enviar email:`, error);
            return false;
        }
    });
}
