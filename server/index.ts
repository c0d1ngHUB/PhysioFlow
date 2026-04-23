import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import db from './db/index.js';

import patientsRouter from './routes/patients.js';
import appointmentsRouter from './routes/appointments.js';
import invoicesRouter from './routes/invoices.js';
import smsRouter from './routes/sms.js';
import dashboardRouter from './routes/dashboard.js';
import expensesRouter from './routes/expenses.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Allowed origins for CORS
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3001',
  'http://192.168.1.69:3001',
  'https://physio-flow.online',
];

// ---------------------------------------------------------------------------
// CORS – restrict to known origins, credentials required for session cookies
// ---------------------------------------------------------------------------
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, server-to-server) in dev only
    if (!origin && process.env.NODE_ENV !== 'production') {
      callback(null, true);
      return;
    }
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS origin not allowed'));
    }
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
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.SESSION_COOKIE_SECURE === 'true', // Set 'true' when behind HTTPS reverse proxy
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
      res.status(403).json({ success: false, error: 'Missing Origin header' });
      return;
    }
    // In dev, allow localhost without Origin
    return next();
  }
  if (!ALLOWED_ORIGINS.includes(origin)) {
    res.status(403).json({ success: false, error: 'Invalid Origin' });
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
  message: { success: false, error: 'Too many login attempts. Try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/auth/login', express.json(), loginLimiter, async (req: express.Request, res: express.Response) => {
  const { username, password } = req.body || {};
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  const logAudit = (action: string, success: boolean) => {
    try {
      db.prepare('INSERT INTO audit_logs (action, username, ip, success) VALUES (?, ?, ?, ?)')
        .run(action, username || '', ip, success ? 1 : 0);
    } catch (e) { /* audit logging must not break login */ }
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
        req.session.isAuthenticated = true;
        req.session.user = { username: 'admin', role: 'admin' };
        req.session.save(() => {
          res.json({ success: true, user: { username: 'admin', role: 'admin' } });
        });
        return;
      }
      logAudit('login-legacy', false);
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }
  }

  // Standard user lookup
  if (!username || !password) {
    logAudit('login-missing-fields', false);
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  const user = db.prepare('SELECT id, username, password_hash, role FROM users WHERE username = ?')
    .get(username) as { id: number; username: string; password_hash: string; role: string } | undefined;

  if (!user) {
    logAudit('login-user-not-found', false);
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    logAudit('login-wrong-password', false);
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  logAudit('login', true);
  req.session.isAuthenticated = true;
  req.session.user = { username: user.username, role: user.role };
  req.session.save(() => {
    res.json({ success: true, user: { username: user.username, role: user.role } });
  });
});

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
    res.status(401).json({ success: false, error: 'Authentication required' });
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

// ---------------------------------------------------------------------------
// Serve static files in production
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(process.cwd(), 'dist');
  console.log(`📁 Serving static files from: ${distPath}`);
  app.use(express.static(distPath));
  app.get(/.*/, (req: express.Request, res: express.Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ---------------------------------------------------------------------------
// Error handling middleware
// ---------------------------------------------------------------------------
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ success: false, error: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 PhysioFlow Server running on http://localhost:${PORT}`);
});