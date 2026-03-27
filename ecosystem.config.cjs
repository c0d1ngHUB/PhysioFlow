module.exports = {
  apps: [{
    name: 'physioflow',
    script: './node_modules/.bin/tsx',
    args: 'server/index.ts',
    cwd: '/home/m3kky/PhysioFlow',
    interpreter: 'none',
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    log_file: '/home/m3kky/.pm2/logs/physioflow-out.log',
    out_file: '/home/m3kky/.pm2/logs/physioflow-out.log',
    error_file: '/home/m3kky/.pm2/logs/physioflow-error.log',
    time: true
  }]
};
