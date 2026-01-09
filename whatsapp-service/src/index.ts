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

app.listen(PORT, async () => {
  console.log(`WhatsApp Service running on port ${PORT}`);
  
  // Aguardar 3 segundos antes de iniciar reconexões (tempo para servidor estabilizar)
  setTimeout(async () => {
    const { loadSavedConnections } = await import('./types');
    console.log(`[${new Date().toISOString()}] 🚀 Iniciando reconexão automática das conexões WhatsApp...`);
    await loadSavedConnections();
  }, 3000);
});
