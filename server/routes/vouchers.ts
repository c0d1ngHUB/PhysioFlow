import { Router } from 'express';
import db from '../db/index.js';
import { respondWithServerError } from '../utils/httpErrors.js';

const router = Router();

router.get('/', (_req, res) => {
  try {
    const vouchers = db.prepare(`
      SELECT v.*, p.first_name || ' ' || p.last_name AS patient_name
      FROM vouchers v
      LEFT JOIN patients p ON v.patient_id = p.id
      ORDER BY v.created_at DESC, v.id DESC
    `).all();

    res.json({ success: true, data: vouchers });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Laden der Gutscheine:', 'Gutscheine konnten nicht geladen werden.');
  }
});

router.post('/', (req, res) => {
  const { code, patient_id, description, value, expires_at } = req.body ?? {};

  if (!code || !description || Number(value) <= 0) {
    return res.status(400).json({ success: false, error: 'Code, Beschreibung und Wert sind erforderlich' });
  }

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

    res.status(201).json({ success: true, data: voucher });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Erstellen des Gutscheins:', 'Gutschein konnte nicht angelegt werden.');
  }
});

router.put('/:id', (req, res) => {
  const { code, patient_id, description, value, expires_at, used } = req.body ?? {};

  if (!code || !description || Number(value) <= 0) {
    return res.status(400).json({ success: false, error: 'Code, Beschreibung und Wert sind erforderlich' });
  }

  try {
    const current = db.prepare('SELECT * FROM vouchers WHERE id = ?').get(req.params.id) as { used: number; used_date: string | null } | undefined;
    if (!current) {
      return res.status(404).json({ success: false, error: 'Gutschein nicht gefunden' });
    }

    const nextUsed = used ? 1 : 0;
    const usedDate = nextUsed ? (current.used_date ?? new Date().toISOString()) : null;

    const result = db.prepare(`
      UPDATE vouchers
      SET code = ?, patient_id = ?, description = ?, value = ?, expires_at = ?, used = ?, used_date = ?
      WHERE id = ?
    `).run(String(code).trim().toUpperCase(), patient_id || null, String(description).trim(), Number(value), expires_at || null, nextUsed, usedDate, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Gutschein nicht gefunden' });
    }

    const voucher = db.prepare(`
      SELECT v.*, p.first_name || ' ' || p.last_name AS patient_name
      FROM vouchers v
      LEFT JOIN patients p ON v.patient_id = p.id
      WHERE v.id = ?
    `).get(req.params.id);

    res.json({ success: true, data: voucher });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Aktualisieren des Gutscheins:', 'Gutschein konnte nicht aktualisiert werden.');
  }
});

router.post('/:id/use', (req, res) => {
  const { used } = req.body ?? {};

  try {
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

    res.json({ success: true, data: voucher });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Ändern des Gutscheinstatus:', 'Gutscheinstatus konnte nicht aktualisiert werden.');
  }
});

router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM vouchers WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Gutschein nicht gefunden' });
    }

    res.json({ success: true, message: 'Gutschein gelöscht' });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Löschen des Gutscheins:', 'Gutschein konnte nicht gelöscht werden.');
  }
});

export default router;
