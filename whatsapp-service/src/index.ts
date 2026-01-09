import express from 'express';
import cors from 'cors';
import whatsappRoutes from './routes/whatsappRoutes';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: '*',
  credentials: true,
}));

// Rotas
app.use('/whatsapp', whatsappRoutes);

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
    const { loadSavedConnections } = await import('./types');
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
