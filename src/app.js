const express = require('express');
const bodyParser = require('body-parser');
const { setupWhatsAppIntegration } = require('./services/whatsapp');
const { setupDatabase } = require('./services/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Initialize services
setupDatabase();
setupWhatsAppIntegration(app);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});