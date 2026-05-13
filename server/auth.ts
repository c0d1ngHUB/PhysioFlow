import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

const COOKIE_NAME = 'physioflow_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12h

function getSecret() {
  return process.env.SESSION_SECRET || 'physioflow-dev-secret-change-me';
}

function sign(value: string) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
}

function encodeSession(username: string) {
  const payload = JSON.stringify({ username, exp: Date.now() + SESSION_TTL_MS });
  const base = Buffer.from(payload, 'utf8').toString('base64url');
  return `${base}.${sign(base)}`;
}

function decodeSession(token?: string | null): { username: string; exp: number } | null {
  if (!token) return null;
  const [base, sig] = token.split('.');
  if (!base || !sig) return null;
  if (sign(base) !== sig) return null;

  try {
    const payload = JSON.parse(Buffer.from(base, 'base64url').toString('utf8')) as { username: string; exp: number };
    if (!payload?.username || !payload?.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(req: Request) {
  const header = req.headers.cookie;
  const cookies: Record<string, string> = {};
  if (!header) return cookies;

  for (const part of header.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey) continue;
    cookies[rawKey] = decodeURIComponent(rest.join('='));
  }

  return cookies;
}

export function getAuthenticatedUser(req: Request) {
  const cookies = parseCookies(req);
  return decodeSession(cookies[COOKIE_NAME]);
}

export function setSessionCookie(res: Response, username: string) {
  const token = encodeSession(username);
  const secure = process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_MS / 1000}${secure ? '; Secure' : ''}`);
}

export function clearSessionCookie(res: Response) {
  const secure = process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (getAuthenticatedUser(req)) return next();
  return res.status(401).json({ success: false, error: 'Nicht eingeloggt' });
}

export function validateAdminCredentials(username?: string, password?: string) {
  const expectedUser = process.env.PHYSIOFLOW_ADMIN_USER || 'admin';
  const expectedPass = process.env.PHYSIOFLOW_ADMIN_PASSWORD;

  if (!expectedPass) {
    return { ok: false, reason: 'Admin-Passwort ist auf dem Server nicht gesetzt' };
  }

  if (username !== expectedUser || password !== expectedPass) {
    return { ok: false, reason: 'Benutzername oder Passwort falsch' };
  }

  return { ok: true as const, username: expectedUser };
}
