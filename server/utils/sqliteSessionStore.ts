import session from 'express-session';
import type Database from 'better-sqlite3';

type SessionRow = {
  data: string;
  expires_at: number;
};

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

function getSessionExpiry(sessionData: session.SessionData): number {
  const cookie = sessionData.cookie;

  if (cookie.expires) {
    const expires = cookie.expires instanceof Date
      ? cookie.expires
      : new Date(cookie.expires);
    const expiresAt = expires.getTime();
    if (Number.isFinite(expiresAt)) {
      return expiresAt;
    }
  }

  if (typeof cookie.originalMaxAge === 'number') {
    return Date.now() + cookie.originalMaxAge;
  }

  return Date.now() + DEFAULT_TTL_MS;
}

export class SqliteSessionStore extends session.Store {
  private readonly db: Database.Database;

  constructor(db: Database.Database) {
    super();
    this.db = db;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);
    `);
  }

  get(sid: string, callback: (err: unknown, session?: session.SessionData | null) => void): void {
    try {
      const row = this.db
        .prepare('SELECT data, expires_at FROM sessions WHERE sid = ?')
        .get(sid) as SessionRow | undefined;

      if (!row) {
        callback(null, null);
        return;
      }

      if (row.expires_at <= Date.now()) {
        this.destroy(sid, () => callback(null, null));
        return;
      }

      callback(null, JSON.parse(row.data) as session.SessionData);
    } catch (err) {
      callback(err);
    }
  }

  set(sid: string, sessionData: session.SessionData, callback?: (err?: unknown) => void): void {
    try {
      const expiresAt = getSessionExpiry(sessionData);
      this.db
        .prepare(`
          INSERT INTO sessions (sid, data, expires_at)
          VALUES (?, ?, ?)
          ON CONFLICT(sid) DO UPDATE SET
            data = excluded.data,
            expires_at = excluded.expires_at
        `)
        .run(sid, JSON.stringify(sessionData), expiresAt);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  destroy(sid: string, callback?: (err?: unknown) => void): void {
    try {
      this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  touch(sid: string, sessionData: session.SessionData, callback?: (err?: unknown) => void): void {
    try {
      this.db
        .prepare('UPDATE sessions SET expires_at = ? WHERE sid = ?')
        .run(getSessionExpiry(sessionData), sid);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  clearExpiredSessions(): number {
    return this.db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now()).changes;
  }
}

export function createSessionStore(db: Database.Database): SqliteSessionStore {
  const store = new SqliteSessionStore(db);
  const removed = store.clearExpiredSessions();
  if (removed > 0) {
    console.log(`🧹 Removed ${removed} expired sessions`);
  }
  return store;
}
