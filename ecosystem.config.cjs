module.exports = {
  apps: [
    {
      name: 'physioflow-server',
      script: '/home/pi/PhysioFlow/server/index.ts',
      interpreter: 'node',
      node_args: '--import tsx',
      cwd: '/home/pi/PhysioFlow',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
    // physioflow-frontend REMOVED — backend serves static files from dist/ on :3001
    // Caddy proxies physio-flow.online → 127.0.0.1:3001
  ],
};