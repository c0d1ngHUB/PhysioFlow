import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import type { RequestHandler } from 'express';

import db, { initDatabase } from './db/index.js';

import patientsRouter from './routes/patients.js';
import appointmentsRouter from './routes/appointments.js';
import invoicesRouter from './routes/invoices.js';
import smsRouter from './routes/sms.js';
import dashboardRouter from './routes/dashboard.js';
import expensesRouter from './routes/expenses.js';
import therapistsRouter from './routes/therapists.js';
import vouchersRouter from './routes/vouchers.js';
import { csrfMiddleware, getCsrfToken, regenerateCsrfToken } from './utils/csrf.js';
import { requireRole } from './utils/auth.js';
import { respondWithServerError } from './utils/httpErrors.js';

dotenv.config();

async function main() {
  await initDatabase();

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
      return true; // allow same-origin & direct requests (no Origin header)
    }

    return ALLOWED_ORIGINS.includes(origin);
  }

  // ---------------------------------------------------------------------------
  // Helmet – security headers
  // ---------------------------------------------------------------------------
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    xFrameOptions: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));

  // ---------------------------------------------------------------------------
  // CORS – restrict to known origins, credentials required for session cookies
  // ---------------------------------------------------------------------------
  app.use(cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
  }));

  // ---------------------------------------------------------------------------
  // JSON body parsing
  // ---------------------------------------------------------------------------
  app.use(express.json());

  // DEBUG: Request logger (nur in Entwicklung)
  if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
      console.log('[DEBUG REQUEST]', req.method, req.url, req.path);
      next();
    });
  }

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
  console.log('[DEBUG] Setting up session middleware...');
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
  console.log('[DEBUG] Session middleware configured');

  // ---------------------------------------------------------------------------
  // CSRF protection — Double Submit Cookie via session
  // ---------------------------------------------------------------------------
  console.log('[DEBUG] Setting up CSRF middleware...');
  app.use('/api', (req, res, next) => {
    console.log('[DEBUG] CSRF middleware hit:', req.method, req.path);
    try {
      csrfMiddleware(req, res, next);
    } catch (err) {
      console.error('[DEBUG] CSRF middleware ERROR:', err);
      next(err);
    }
  });
  console.log('[DEBUG] CSRF middleware configured');

  app.get('/api/csrf-token', (req: express.Request, res: express.Response) => {
    console.log('[DEBUG] /api/csrf-token hit');
    console.log('[DEBUG] req.session exists?', !!req.session);
    console.log('[DEBUG] req.session type:', typeof req.session);
    if (req.session) {
      console.log('[DEBUG] req.session keys:', Object.keys(req.session));
    }
    try {
      getCsrfToken(req, res);
    } catch (err) {
      console.error('[DEBUG] getCsrfToken error:', err);
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // ---------------------------------------------------------------------------
  // Auth routes
  // ---------------------------------------------------------------------------
  // Login rate limiter: 5 attempts per 15 minutes per IP
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, error: 'Zu viele Anmeldeversuche. Bitte in 15 Minuten erneut versuchen.', code: 'rate_limited' },
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

    const finalizeLogin = (sessionUser: { id: number; username: string; role: string }) => {
      req.session.regenerate((regenerateError) => {
        if (regenerateError) {
          respondWithServerError(res, regenerateError, 'Fehler bei Session-Regeneration nach Login:');
          return;
        }

        req.session.isAuthenticated = true;
        req.session.user = sessionUser;
        regenerateCsrfToken(req);
        req.session.save((saveError) => {
          if (saveError) {
            respondWithServerError(res, saveError, 'Fehler beim Speichern der Session nach Login:');
            return;
          }

          res.json({ success: true, user: sessionUser, csrfToken: req.session.csrfToken });
        });
      });
    };

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
    finalizeLogin({ id: user.id, username: user.username, role: user.role });
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
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('GLOBAL ERROR HANDLER CAUGHT:');
    console.error('Error:', err);
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
    console.error('═══════════════════════════════════════════════════════════════');
    respondWithServerError(res, err, 'Unbehandelter Serverfehler:');
  });

  app.listen(PORT, () => {
    console.log(`🚀 PhysioFlow Server running on http://localhost:${PORT}`);
  });
}

main().catch(console.error);
