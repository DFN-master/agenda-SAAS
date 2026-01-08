import express from 'express';
import { sequelize } from './models';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Test database connection
sequelize.authenticate()
  .then(() => console.log('Database connected successfully'))
  .catch((err) => console.error('Database connection failed:', err));

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});