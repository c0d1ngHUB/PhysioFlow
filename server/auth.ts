import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

const COOKIE_NAME = 'physioflow_session';

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET muss in Produktion gesetzt sein');
  }
  return secret || 'physioflow-dev-secret-change-me';
}

export function validateAuthConfig() {
  getSecret();
}

function getSessionTtlMs() {
  const ttlHours = Number(process.env.SESSION_TTL_HOURS || 12);
  const safeTtlHours = Number.isFinite(ttlHours) && ttlHours > 0 ? ttlHours : 12;
  return safeTtlHours * 60 * 60 * 1000;
}

function timingSafeStringEqual(a: string, b: string) {
  const aHash = crypto.createHash('sha256').update(a, 'utf8').digest();
  const bHash = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(aHash, bHash);
}

function sign(value: string) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
}

function encodeSession(username: string) {
  const payload = JSON.stringify({ username, exp: Date.now() + getSessionTtlMs() });
  const base = Buffer.from(payload, 'utf8').toString('base64url');
  return `${base}.${sign(base)}`;
}

function decodeSession(token?: string | null): { username: string; exp: number } | null {
  if (!token) return null;
  const [base, sig] = token.split('.');
  if (!base || !sig) return null;
  if (!timingSafeStringEqual(sign(base), sig)) return null;

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
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${getSessionTtlMs() / 1000}${secure ? '; Secure' : ''}`);
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

  // Environment passwords are still plaintext here for backwards compatibility.
  // Use bcrypt or argon2 password hashes for production deployments.
  const userMatches = timingSafeStringEqual(String(username || '').toLocaleLowerCase(), expectedUser.toLocaleLowerCase());
  const passwordMatches = timingSafeStringEqual(String(password || ''), expectedPass);

  if (!userMatches || !passwordMatches) {
    return { ok: false, reason: 'Benutzername oder Passwort falsch' };
  }

  return { ok: true as const, username: expectedUser };
}
