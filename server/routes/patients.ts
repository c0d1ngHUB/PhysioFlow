import { Router } from 'express';
import db from '../db/index.js';
import { requireRole } from '../utils/auth.js';
import { respondWithServerError } from '../utils/httpErrors.js';
import { patientSchema, patientUpdateSchema, validateBody } from '../utils/validation.js';
import { logAudit, getAuditContext, safeJson } from '../utils/auditLog.js';
import { getPaginationParams, paginatedResponse } from '../utils/pagination.js';

const router = Router();

// Ensure newer columns exist (idempotent for existing databases)
try {
  db.prepare('ALTER TABLE patients ADD COLUMN insurance_number TEXT').run();
} catch { /* column already exists */ }
try {
  db.prepare('ALTER TABLE patients ADD COLUMN address TEXT').run();
} catch { /* column already exists */ }

// Get all patients
router.get('/', (req, res) => {
  try {
    const { page, limit } = getPaginationParams(req);
    const offset = (page - 1) * limit;

    const countResult = db.prepare('SELECT COUNT(*) as total FROM patients').get() as { total: number };
    const total = countResult.total;

    const patients = db.prepare('SELECT * FROM patients ORDER BY last_name, first_name LIMIT ? OFFSET ?').all(limit, offset);

    res.json(paginatedResponse(patients, total, page, limit));
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Laden der Patient:innen:', 'Patient:innen konnten nicht geladen werden.');
  }
});

// Get single patient
router.get('/:id', (req, res) => {
  try {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient nicht gefunden' });
    }
    res.json({ success: true, data: patient });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Laden des Patienten:', 'Patient/in konnte nicht geladen werden.');
  }
});

// Create patient
router.post('/', requireRole('admin'), validateBody(patientSchema), (req, res) => {
  const { first_name, last_name, phone, email, birthdate, notes, address, insurance_number } = req.body;

  try {
    const result = db.prepare(`
      INSERT INTO patients (first_name, last_name, phone, email, birthdate, notes, address, insurance_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(first_name, last_name, phone || null, email || null, birthdate || null, notes || null, address || null, insurance_number || null);

    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(result.lastInsertRowid);
    const ctx = getAuditContext(req);
    logAudit({ ...ctx, action: 'create', entity_type: 'patient', entity_id: result.lastInsertRowid, new_value: safeJson(patient), success: true });
    res.status(201).json({ success: true, data: patient });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Erstellen des Patienten:', 'Patient/in konnte nicht angelegt werden.');
  }
});

// Update patient
router.put('/:id', requireRole('admin'), validateBody(patientUpdateSchema), (req, res) => {
  const { id } = req.params;
  const body = req.body as Record<string, unknown>;

  try {
    const old = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
    if (!old) {
      return res.status(404).json({ success: false, error: 'Patient nicht gefunden' });
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if ('first_name' in body) { updates.push('first_name = ?'); values.push(body.first_name); }
    if ('last_name' in body) { updates.push('last_name = ?'); values.push(body.last_name); }
    if ('phone' in body) { updates.push('phone = ?'); values.push(body.phone); }
    if ('email' in body) { updates.push('email = ?'); values.push(body.email); }
    if ('birthdate' in body) { updates.push('birthdate = ?'); values.push(body.birthdate); }
    if ('notes' in body) { updates.push('notes = ?'); values.push(body.notes); }
    if ('address' in body) { updates.push('address = ?'); values.push(body.address); }
    if ('insurance_number' in body) { updates.push('insurance_number = ?'); values.push(body.insurance_number); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'Keine Felder zum Aktualisieren angegeben' });
    }

    values.push(id);
    db.prepare(`UPDATE patients SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
    const ctx = getAuditContext(req);
    logAudit({ ...ctx, action: 'update', entity_type: 'patient', entity_id: id, old_value: safeJson(old), new_value: safeJson(patient), success: true });
    res.json({ success: true, data: patient });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Aktualisieren des Patienten:', 'Patient/in konnte nicht aktualisiert werden.');
  }
});

// Delete patient
router.delete('/:id', requireRole('admin'), (req, res) => {
  try {
    const old = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    const result = db.prepare('DELETE FROM patients WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Patient nicht gefunden' });
    }
    const ctx = getAuditContext(req);
    logAudit({ ...ctx, action: 'delete', entity_type: 'patient', entity_id: req.params.id, old_value: safeJson(old), success: true });
    res.json({ success: true, message: 'Patient erfolgreich gelöscht' });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Löschen des Patienten:', 'Patient/in konnte nicht gelöscht werden.');
  }
});

// Get patient history (appointments + invoices)
router.get('/:id/history', (req, res) => {
  const { id } = req.params;

  try {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient nicht gefunden' });
    }

    const appointments = db.prepare(`
      SELECT * FROM appointments
      WHERE patient_id = ?
      ORDER BY date DESC, time_start DESC
    `).all(id);

    const invoices = db.prepare(`
      SELECT * FROM invoices
      WHERE patient_id = ?
      ORDER BY created_at DESC
    `).all(id);

    res.json({ success: true, data: { patient, appointments, invoices } });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Laden der Patientenhistorie:', 'Patientenhistorie konnte nicht geladen werden.');
  }
});

export default router;
