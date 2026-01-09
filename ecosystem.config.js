module.exports = {
  apps: [
    {
      name: 'agenda-backend',
      cwd: './backend',
      script: './dist/index.js',
      env_file: './.env',
      min_uptime: 5000,
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '8G',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'agenda-frontend',
      cwd: './frontend',
      script: './node_modules/vite/bin/vite.js',
      env: {
        NODE_ENV: 'development'
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '8G',
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'whatsapp-service',
      cwd: './whatsapp-service',
      script: './dist/index.js',
      env_file: './.env',
      min_uptime: 5000,
      env: {
        NODE_ENV: 'development',
        PORT: 4000
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '8G',
      error_file: './logs/whatsapp-error.log',
      out_file: './logs/whatsapp-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'cognitive-engine',
      cwd: './ai-service',
      script: 'cognitive_engine.py',
      interpreter: 'python',
      env_file: './backend/.env',
      env: {
        NODE_ENV: 'development',
        PORT: 5001
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      error_file: './logs/cognitive-error.log',
      out_file: './logs/cognitive-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
