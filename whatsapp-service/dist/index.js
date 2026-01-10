"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const whatsappRoutes_1 = __importDefault(require("./routes/whatsappRoutes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4001; // Default 4001, não 4000 (Whatsmeow usa 4000)
// Middleware
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: '*',
    credentials: true,
}));
// Rotas
app.use('/whatsapp', whatsappRoutes_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'whatsapp-service', timestamp: new Date().toISOString() });
});
app.get('/', (req, res) => {
    res.json({ message: 'WhatsApp Microservice', version: '1.0.0' });
});
// Iniciar o servidor e manter o processo rodando
const server = app.listen(PORT, async () => {
    console.log(`WhatsApp Service running on port ${PORT}`);
    // Aguardar 3 segundos antes de iniciar reconexões (tempo para servidor estabilizar)
    setTimeout(async () => {
        const { loadSavedConnections } = await Promise.resolve().then(() => __importStar(require('./types')));
        console.log(`[${new Date().toISOString()}] 🚀 Iniciando reconexão automática das conexões WhatsApp...`);
        await loadSavedConnections();
        console.log(`[${new Date().toISOString()}] 🎯 Serviço WhatsApp pronto para receber requisições`);
    }, 3000);
});
// Manter o processo rodando
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});
process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});
//# sourceMappingURL=index.js.map