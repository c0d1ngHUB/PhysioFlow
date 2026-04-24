module.exports = {
  apps: [
    {
      name: 'physioflow-server',
      script: 'server/index.ts',
      interpreter: 'node',
      node_args: '--import tsx',
      cwd: '/home/m3kky/PhysioFlow',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
    // physioflow-frontend REMOVED — backend serves static files from dist/ on :3001
    // Caddy proxies physio-flow.online → 127.0.0.1:3001
  ],
};