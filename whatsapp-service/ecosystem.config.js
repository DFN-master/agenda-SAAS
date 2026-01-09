module.exports = {
  apps: [{
    name: 'agenda-whatsapp',
    script: 'src/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    cwd: 'd:/Agenda-Sys/whatsapp-service',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: './logs/whatsapp-error.log',
    out_file: './logs/whatsapp-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
