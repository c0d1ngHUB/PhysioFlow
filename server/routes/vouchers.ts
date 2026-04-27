import { Router } from 'express';
import db from '../db/index.js';
import { respondWithServerError } from '../utils/httpErrors.js';
import { requireAuth, requireRole } from '../utils/auth.js';
import { voucherSchema, voucherUpdateSchema, validateBody } from '../utils/validation.js';
import { logAudit, getAuditContext, safeJson } from '../utils/auditLog.js';
import { getPaginationParams, paginatedResponse } from '../utils/pagination.js';

const router = Router();

// Alle Voucher-Routen erfordern Authentifizierung
router.use(requireAuth);

// POST, PUT, DELETE nur für Admin
router.post('/', requireRole('admin'));
router.put('/:id', requireRole('admin'));
router.delete('/:id', requireRole('admin'));

router.get('/', (req, res) => {
  try {
    const { page, limit } = getPaginationParams(req);
    const offset = (page - 1) * limit;

    const countResult = db.prepare(`
      SELECT COUNT(*) as total FROM vouchers
    `).get() as { total: number };
    const total = countResult?.total || 0;

    const vouchers = db.prepare(`
      SELECT v.*, p.first_name || ' ' || p.last_name AS patient_name
      FROM vouchers v
      LEFT JOIN patients p ON v.patient_id = p.id
      ORDER BY v.created_at DESC, v.id DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    res.json(paginatedResponse(vouchers, total, page, limit));
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Laden der Gutscheine:', 'Gutscheine konnten nicht geladen werden.');
  }
});

router.post('/', validateBody(voucherSchema), (req, res) => {
  const { code, patient_id, description, value, expires_at } = req.body ?? {};

  try {
    const result = db.prepare(`
      INSERT INTO vouchers (code, patient_id, description, value, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(String(code).trim().toUpperCase(), patient_id || null, String(description).trim(), Number(value), expires_at || null);

    const voucher = db.prepare(`
      SELECT v.*, p.first_name || ' ' || p.last_name AS patient_name
      FROM vouchers v
      LEFT JOIN patients p ON v.patient_id = p.id
      WHERE v.id = ?
    `).get(result.lastInsertRowid);

    const ctx = getAuditContext(req);
    logAudit({ ...ctx, action: 'create', entity_type: 'voucher', entity_id: result.lastInsertRowid, new_value: safeJson(voucher), success: true });

    res.status(201).json({ success: true, data: voucher });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Erstellen des Gutscheins:', 'Gutschein konnte nicht angelegt werden.');
  }
});

router.put('/:id', validateBody(voucherUpdateSchema), (req, res) => {
  const { code, patient_id, description, value, expires_at, used } = req.body ?? {};

  try {
    const current = db.prepare('SELECT * FROM vouchers WHERE id = ?').get(req.params.id) as { used: number; used_date: string | null; code: string; description: string; value: number; expires_at: string | null; patient_id: number | null } | undefined;
    if (!current) {
      return res.status(404).json({ success: false, error: 'Gutschein nicht gefunden' });
    }

    const nextCode = code !== undefined ? String(code).trim().toUpperCase() : current.code;
    const nextPatientId = patient_id !== undefined ? patient_id : current.patient_id;
    const nextDesc = description !== undefined ? String(description).trim() : current.description;
    const nextValue = value !== undefined ? Number(value) : current.value;
    const nextExpires = expires_at !== undefined ? expires_at : current.expires_at;
    const nextUsed = used ? 1 : 0;
    const usedDate = nextUsed ? (current.used_date ?? new Date().toISOString()) : null;

    const result = db.prepare(`
      UPDATE vouchers
      SET code = ?, patient_id = ?, description = ?, value = ?, expires_at = ?, used = ?, used_date = ?
      WHERE id = ?
    `).run(nextCode, nextPatientId, nextDesc, nextValue, nextExpires, nextUsed, usedDate, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Gutschein nicht gefunden' });
    }

    const voucher = db.prepare(`
      SELECT v.*, p.first_name || ' ' || p.last_name AS patient_name
      FROM vouchers v
      LEFT JOIN patients p ON v.patient_id = p.id
      WHERE v.id = ?
    `).get(req.params.id);

    const ctx = getAuditContext(req);
    logAudit({ ...ctx, action: 'update', entity_type: 'voucher', entity_id: req.params.id, old_value: safeJson(current), new_value: safeJson(voucher), success: true });

    res.json({ success: true, data: voucher });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Aktualisieren des Gutscheins:', 'Gutschein konnte nicht aktualisiert werden.');
  }
});

router.post('/:id/use', (req, res) => {
  const { used } = req.body ?? {};

  try {
    const current = db.prepare('SELECT * FROM vouchers WHERE id = ?').get(req.params.id);
    const result = db.prepare(`
      UPDATE vouchers
      SET used = ?, used_date = ?
      WHERE id = ?
    `).run(used ? 1 : 0, used ? new Date().toISOString() : null, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Gutschein nicht gefunden' });
    }

    const voucher = db.prepare(`
      SELECT v.*, p.first_name || ' ' || p.last_name AS patient_name
      FROM vouchers v
      LEFT JOIN patients p ON v.patient_id = p.id
      WHERE v.id = ?
    `).get(req.params.id);

    const ctx = getAuditContext(req);
    logAudit({ ...ctx, action: used ? 'use' : 'unuse', entity_type: 'voucher', entity_id: req.params.id, old_value: safeJson(current), new_value: safeJson(voucher), success: true });

    res.json({ success: true, data: voucher });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Ändern des Gutscheinstatus:', 'Gutscheinstatus konnte nicht aktualisiert werden.');
  }
});

router.delete('/:id', (req, res) => {
  try {
    const old = db.prepare('SELECT * FROM vouchers WHERE id = ?').get(req.params.id);
    const result = db.prepare('DELETE FROM vouchers WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Gutschein nicht gefunden' });
    }

    const ctx = getAuditContext(req);
    logAudit({ ...ctx, action: 'delete', entity_type: 'voucher', entity_id: req.params.id, old_value: safeJson(old), success: true });

    res.json({ success: true, message: 'Gutschein gelöscht' });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Löschen des Gutscheins:', 'Gutschein konnte nicht gelöscht werden.');
  }
});

export default router;
