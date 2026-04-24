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
    {
      name: 'physioflow-frontend',
      script: 'node_modules/.bin/vite',
      args: 'preview --port 5173 --host',
      cwd: '/home/m3kky/PhysioFlow',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};