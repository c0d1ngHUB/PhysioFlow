import type { Request } from 'express';
import db from '../db/index.js';

export function logAudit(params: {
  user_id?: number | null;
  username?: string | null;
  action: string;
  ip?: string | null;
  success?: boolean;
  entity_type?: string | null;
  entity_id?: number | bigint | string | string[] | null;
  old_value?: string | null;
  new_value?: string | null;
}) {
  try {
    db.prepare(
      `INSERT INTO audit_logs
       (user_id, username, action, ip, success, entity_type, entity_id, old_value, new_value)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      params.user_id ?? null,
      params.username ?? null,
      params.action,
      params.ip ?? null,
      params.success !== false ? 1 : 0,
      params.entity_type ?? null,
      params.entity_id ?? null,
      params.old_value ?? null,
      params.new_value ?? null
    );
  } catch (e) {
    console.error('Audit log failed:', e);
  }
}

export function getAuditContext(req: Request) {
  return {
    user_id: req.session.user?.id ?? null,
    username: req.session.user?.username ?? null,
    ip: req.ip || req.socket.remoteAddress || null,
  };
}

export function safeJson(value: unknown): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}
