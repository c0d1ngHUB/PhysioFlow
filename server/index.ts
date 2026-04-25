import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import type { RequestHandler } from 'express';

import db from './db/index.js';

import patientsRouter from './routes/patients.js';
import appointmentsRouter from './routes/appointments.js';
import invoicesRouter from './routes/invoices.js';
import smsRouter from './routes/sms.js';
import dashboardRouter from './routes/dashboard.js';
import expensesRouter from './routes/expenses.js';
import therapistsRouter from './routes/therapists.js';
import vouchersRouter from './routes/vouchers.js';
import { requireRole } from './utils/auth.js';
import { respondWithServerError } from './utils/httpErrors.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

function getAllowedOrigins() {
  if (process.env.NODE_ENV === 'production') {
    return [process.env.PHYSIOFLOW_ORIGIN || 'https://physio-flow.online'];
  }

  return [
    'http://localhost:5173',
    'http://localhost:3001',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:4173',
  ];
}

const ALLOWED_ORIGINS = getAllowedOrigins();

function isAllowedOrigin(origin?: string) {
  if (!origin) {
    return process.env.NODE_ENV !== 'production';
  }

  return ALLOWED_ORIGINS.includes(origin);
}

// ---------------------------------------------------------------------------
// CORS – restrict to known origins, credentials required for session cookies
// ---------------------------------------------------------------------------
app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('CORS Origin nicht erlaubt'));
  },
  credentials: true,
}));

// ---------------------------------------------------------------------------
// JSON body parsing
// ---------------------------------------------------------------------------
app.use(express.json());

// ---------------------------------------------------------------------------
// Session middleware
// ---------------------------------------------------------------------------
const SESSION_SECRET = process.env.SESSION_SECRET
  || (process.env.NODE_ENV === 'production'
    ? undefined
    : 'dev-secret');
if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET is required in production. Set it in .env');
}
app.set('trust proxy', 1);
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// ---------------------------------------------------------------------------
// CSRF protection — verify Origin on mutating requests
// ---------------------------------------------------------------------------
app.use('/api', (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.method === 'GET') return next();
  if (req.path.startsWith('/auth/login')) return next();
  const origin = req.headers.origin;
  if (!origin) {
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({ success: false, error: 'Origin-Header fehlt.' });
      return;
    }
    return next();
  }
  if (!isAllowedOrigin(origin)) {
    res.status(403).json({ success: false, error: 'Ungültige Herkunft.' });
    return;
  }
  next();
});

// ---------------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------------
// Login rate limiter: 5 attempts per minute per IP
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { success: false, error: 'Zu viele Anmeldeversuche. Bitte in einer Minute erneut versuchen.', code: 'rate_limited' },
  standardHeaders: true,
  legacyHeaders: false,
});

function createApiRateLimiter(max: number, message: string) {
  return rateLimit({
    windowMs: 60 * 1000,
    max,
    message: { success: false, error: message, code: 'rate_limited' },
    standardHeaders: true,
    legacyHeaders: false,
  });
}

function applyLimiterForMethods(methods: string[], limiter: RequestHandler): RequestHandler {
  const allowedMethods = new Set(methods);

  return (req, res, next) => {
    if (!allowedMethods.has(req.method)) {
      next();
      return;
    }

    limiter(req, res, next);
  };
}

const pdfGenerationLimiter = createApiRateLimiter(20, 'Zu viele PDF-Anfragen. Bitte in einer Minute erneut versuchen.');
const iCalExportLimiter = createApiRateLimiter(10, 'Zu viele iCal-Exporte. Bitte in einer Minute erneut versuchen.');
const smsLimiter = createApiRateLimiter(10, 'Zu viele SMS-Anfragen. Bitte in einer Minute erneut versuchen.');
const crudLimiter = createApiRateLimiter(60, 'Zu viele Änderungsanfragen. Bitte in einer Minute erneut versuchen.');

app.post('/api/auth/login', express.json(), loginLimiter, async (req: express.Request, res: express.Response) => {
  const { username, password } = req.body || {};
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  const logAudit = (action: string, success: boolean) => {
    try {
      db.prepare('INSERT INTO audit_logs (action, username, ip, success) VALUES (?, ?, ?, ?)')
        .run(action, username || '', ip, success ? 1 : 0);
    } catch (e) { /* audit logging must not break login */ }
  };

  const finalizeLogin = (sessionUser: { username: string; role: string }) => {
    req.session.regenerate((regenerateError) => {
      if (regenerateError) {
        respondWithServerError(res, regenerateError, 'Fehler bei Session-Regeneration nach Login:');
        return;
      }

      req.session.isAuthenticated = true;
      req.session.user = sessionUser;
      req.session.save((saveError) => {
        if (saveError) {
          respondWithServerError(res, saveError, 'Fehler beim Speichern der Session nach Login:');
          return;
        }

        res.json({ success: true, user: sessionUser });
      });
    });
  };

  // Legacy fallback: if no username provided and PHYSIOFLOW_PASSWORD is set, allow plain-password login
  if (!username && password) {
    const envPassword = process.env.PHYSIOFLOW_PASSWORD;
    if (envPassword) {
      // Check if it looks like a bcrypt hash — if so, compare; otherwise plain text for migration
      const isLegacyPlain = !envPassword.startsWith('$2');
      let legacyMatch = false;
      if (isLegacyPlain) {
        legacyMatch = password === envPassword;
      } else {
        legacyMatch = await bcrypt.compare(password, envPassword);
      }
      if (legacyMatch) {
        logAudit('login-legacy', true);
        finalizeLogin({ username: 'admin', role: 'admin' });
        return;
      }
      logAudit('login-legacy', false);
      res.status(401).json({ success: false, error: 'Ungültige Anmeldedaten', code: 'invalid_credentials' });
      return;
    }
  }

  // Standard user lookup
  if (!username || !password) {
    logAudit('login-missing-fields', false);
    res.status(401).json({ success: false, error: 'Benutzername und Passwort sind erforderlich', code: 'missing_credentials' });
    return;
  }

  const user = db.prepare('SELECT id, username, password_hash, role FROM users WHERE username = ?')
    .get(username) as { id: number; username: string; password_hash: string; role: string } | undefined;

  if (!user) {
    logAudit('login-user-not-found', false);
    res.status(401).json({ success: false, error: 'Ungültige Anmeldedaten', code: 'invalid_credentials' });
    return;
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    logAudit('login-wrong-password', false);
    res.status(401).json({ success: false, error: 'Ungültige Anmeldedaten', code: 'invalid_credentials' });
    return;
  }

  logAudit('login', true);
  finalizeLogin({ username: user.username, role: user.role });
});

app.use('/api/invoices/:id/pdf', applyLimiterForMethods(['GET'], pdfGenerationLimiter));
app.use('/api/appointments/ical', applyLimiterForMethods(['GET'], iCalExportLimiter));
app.use('/api/sms', applyLimiterForMethods(['POST'], smsLimiter));
app.use(
  [
    '/api/patients',
    '/api/appointments',
    '/api/invoices',
    '/api/expenses',
    '/api/therapists',
    '/api/vouchers',
  ],
  applyLimiterForMethods(['POST', 'PUT', 'PATCH', 'DELETE'], crudLimiter),
);

app.post('/api/auth/logout', (req: express.Request, res: express.Response) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get('/api/auth/check', (req: express.Request, res: express.Response) => {
  res.json({
    authenticated: req.session.isAuthenticated === true,
    user: req.session.user || null,
  });
});

// ---------------------------------------------------------------------------
// Auth middleware — protect all /api/* except /api/auth/*
// ---------------------------------------------------------------------------
app.use('/api', (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.path.startsWith('/auth/')) return next();
  if (req.session.isAuthenticated !== true) {
    res.status(401).json({ success: false, error: 'Anmeldung erforderlich.' });
    return;
  }
  next();
});

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------
app.use('/api/patients', patientsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/sms', smsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/therapists', therapistsRouter);
app.use('/api/vouchers', requireRole('admin'), vouchersRouter);

// ---------------------------------------------------------------------------
// Serve static files in production
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(process.cwd(), 'dist');
  console.log(`📁 Serving static files from: ${distPath}`);
  app.use(express.static(distPath));
  app.get(/.*/, (_req: express.Request, res: express.Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ---------------------------------------------------------------------------
// Error handling middleware
// ---------------------------------------------------------------------------
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  respondWithServerError(res, err, 'Unbehandelter Serverfehler:');
});

app.listen(PORT, () => {
  console.log(`🚀 PhysioFlow Server running on http://localhost:${PORT}`);
});
