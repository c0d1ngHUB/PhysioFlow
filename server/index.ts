import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import patientsRouter from './routes/patients.js';
import appointmentsRouter from './routes/appointments.js';
import invoicesRouter from './routes/invoices.js';
import smsRouter from './routes/sms.js';
import dashboardRouter from './routes/dashboard.js';
import expensesRouter from './routes/expenses.js';
import {
  clearSessionCookie,
  getAuthenticatedUser,
  requireAuth,
  setSessionCookie,
  validateAdminCredentials,
} from './auth.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || (process.env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0');
const authEnabled = Boolean(process.env.PHYSIOFLOW_ADMIN_PASSWORD);

// Middleware
app.use(cors({ credentials: true, origin: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', authEnabled } });
});

app.get('/api/auth/session', (req, res) => {
  const user = getAuthenticatedUser(req);
  res.json({
    success: true,
    data: {
      authEnabled,
      authenticated: !!user || !authEnabled,
      username: user?.username ?? null,
    },
  });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body ?? {};

  if (!authEnabled) {
    return res.json({
      success: true,
      data: {
        authEnabled: false,
        authenticated: true,
        username: null,
      },
    });
  }

  const result = validateAdminCredentials(username, password);
  if (!result.ok) {
    return res.status(401).json({ success: false, error: result.reason });
  }

  setSessionCookie(res, result.username);
  return res.json({
    success: true,
    data: {
      authEnabled: true,
      authenticated: true,
      username: result.username,
    },
  });
});

app.post('/api/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ success: true });
});

if (authEnabled) {
  app.use('/api', (req, res, next) => {
    if (req.path === '/health' || req.path.startsWith('/auth/')) {
      return next();
    }
    return requireAuth(req, res, next);
  });
}

// API Routes
app.use('/api/patients', patientsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/sms', smsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/expenses', expensesRouter);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(process.cwd(), 'dist');
  console.log(`📁 Serving static files from: ${distPath}`);
  app.use(express.static(distPath));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ success: false, error: err.message });
});

app.listen(Number(PORT), HOST, () => {
  console.log(`🚀 PhysioFlow Server running on http://${HOST}:${PORT}`);
});
