import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import db from './db/index.js';

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
  validateAuthConfig,
  validateAdminCredentials,
} from './auth.js';

dotenv.config();
validateAuthConfig();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || (process.env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0');
const authEnabled = Boolean(process.env.PHYSIOFLOW_ADMIN_PASSWORD);

function getAllowedOrigins() {
  const configuredOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('ALLOWED_ORIGINS muss in Produktion gesetzt sein');
  }

  return ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3001', 'http://127.0.0.1:3001'];
}

const allowedOrigins = new Set(getAllowedOrigins());

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Zu viele Login-Versuche. Bitte versuchen Sie es in 15 Minuten erneut.' },
});

// Middleware
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS origin not allowed'));
  },
}));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  db.prepare('SELECT 1').get();
  res.json({ success: true, data: { status: 'ok', authEnabled, database: 'ok' } });
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

app.post('/api/auth/login', loginLimiter, (req, res) => {
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
