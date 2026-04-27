import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const CSRF_HEADER = 'x-csrf-token';

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

function isAllowedOrigin(origin?: string) {
  if (!origin) return process.env.NODE_ENV !== 'production';
  return getAllowedOrigins().includes(origin);
}

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function csrfMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'GET') return next();
  if (req.path.startsWith('/auth/login')) return next();

  // Origin validation
  const origin = req.headers.origin || req.headers.referer;
  if (!isAllowedOrigin(origin)) {
    res.status(403).json({ success: false, error: 'Ursprung nicht erlaubt (Origin-Validation).' });
    return;
  }

  const token = req.headers[CSRF_HEADER] as string | undefined;
  if (!token) {
    res.status(403).json({ success: false, error: 'CSRF-Token fehlt.' });
    return;
  }

  const sessionToken = req.session.csrfToken;
  if (!sessionToken || token !== sessionToken) {
    res.status(403).json({ success: false, error: 'Ungültiger CSRF-Token.' });
    return;
  }

  next();
}

export function getCsrfToken(req: Request, res: Response) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCsrfToken();
  }
  res.json({ success: true, csrfToken: req.session.csrfToken });
}

export function regenerateCsrfToken(req: Request) {
  req.session.csrfToken = generateCsrfToken();
}
