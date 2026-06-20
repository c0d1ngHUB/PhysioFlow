import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth, requireRole } from '../utils/auth.js';
import { respondWithServerError } from '../utils/httpErrors.js';
import { getWeekRange } from '../utils/date.js';
import { appointmentSchema, appointmentUpdateSchema, validateBody } from '../utils/validation.js';
import { logAudit, getAuditContext, safeJson } from '../utils/auditLog.js';
import { getPaginationParams, paginatedResponse } from '../utils/pagination.js';
import { getSingleQueryValue } from '../utils/formatting.js';

const router = Router();
type SqlParam = string | number | null;

function buildIcsDateTime(date: string, time: string): string {
  return `${date.replaceAll('-', '')}T${time.replaceAll(':', '')}00`;
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}



// Get all appointments (with optional date/week/month filter)
router.get('/', (req, res) => {
  const date = getSingleQueryValue(req.query.date);
  const patientId = getSingleQueryValue(req.query.patient_id);
  const therapistId = getSingleQueryValue(req.query.therapist_id);
  const view = getSingleQueryValue(req.query.view);

  let query = `
    SELECT
      a.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.phone as patient_phone,
      t.name as therapist_name,
      t.color as therapist_color
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    LEFT JOIN therapists t ON a.therapist_id = t.id
    WHERE 1=1
  `;
  let countQuery = `
    SELECT COUNT(*) as total
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    LEFT JOIN therapists t ON a.therapist_id = t.id
    WHERE 1=1
  `;
  const params: SqlParam[] = [];

  if (date && !view) {
    query += ' AND a.date = ?';
    countQuery += ' AND a.date = ?';
    params.push(date);
  } else if (date && view === 'week') {
    const { monday, sunday } = getWeekRange(String(date));
    query += ' AND a.date >= ? AND a.date <= ?';
    countQuery += ' AND a.date >= ? AND a.date <= ?';
    params.push(monday, sunday);
  } else if (date && view === 'month') {
    const [year, month] = String(date).split('-').map(Number);
    const start = `${String(year)}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${String(year)}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    query += ' AND a.date >= ? AND a.date <= ?';
    countQuery += ' AND a.date >= ? AND a.date <= ?';
    params.push(start, end);
  } else if (date) {
    query += ' AND a.date = ?';
    countQuery += ' AND a.date = ?';
    params.push(date);
  }

  if (patientId) {
    query += ' AND a.patient_id = ?';
    countQuery += ' AND a.patient_id = ?';
    params.push(patientId);
  }

  if (therapistId) {
    query += ' AND a.therapist_id = ?';
    countQuery += ' AND a.therapist_id = ?';
    params.push(therapistId);
  }

  query += ' ORDER BY a.date, a.time_start';

  try {
    const { page, limit } = getPaginationParams(req);
    const offset = (page - 1) * limit;

    const countResult = db.prepare(countQuery).get(...params) as { total: number };
    const total = countResult?.total || 0;

    const paginatedQuery = query + ' LIMIT ? OFFSET ?';
    const appointments = db.prepare(paginatedQuery).all(...params, limit, offset);

    res.json(paginatedResponse(appointments, total, page, limit));
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Laden der Termine:', 'Termine konnten nicht geladen werden.');
  }
});

router.get('/ical', requireAuth, (_req, res) => {
  try {
    const appointments = db.prepare(`
      SELECT
        a.*,
        p.first_name || ' ' || p.last_name AS patient_name,
        t.name AS therapist_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      LEFT JOIN therapists t ON a.therapist_id = t.id
      WHERE a.status != 'cancelled'
        AND a.date >= date('now')
      ORDER BY a.date ASC, a.time_start ASC
    `).all() as Array<{
      id: number;
      date: string;
      time_start: string;
      time_end: string;
      treatment_type: string;
      notes: string | null;
      patient_name: string;
      therapist_name: string | null;
    }>;

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//PhysioFlow//Kalender//DE',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      ...appointments.flatMap((appointment) => {
        const description = [
          `Patient/in: ${appointment.patient_name}`,
          `Behandlung: ${appointment.treatment_type}`,
          appointment.therapist_name ? `Therapeut/in: ${appointment.therapist_name}` : null,
          appointment.notes ? `Notizen: ${appointment.notes}` : null,
        ].filter(Boolean).join('\n');

        return [
          'BEGIN:VEVENT',
          `UID:appointment-${appointment.id}@physioflow.local`,
          `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`,
          `DTSTART:${buildIcsDateTime(appointment.date, appointment.time_start)}`,
          `DTEND:${buildIcsDateTime(appointment.date, appointment.time_end)}`,
          `SUMMARY:${escapeIcs(`${appointment.patient_name} - ${appointment.treatment_type}`)}`,
          `DESCRIPTION:${escapeIcs(description)}`,
          'END:VEVENT',
        ];
      }),
      'END:VCALENDAR',
    ];

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="physioflow-termine.ics"');
    res.send(lines.join('\r\n'));
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Erstellen des Kalenderexports:', 'Kalenderexport konnte nicht erstellt werden.');
  }
});

// Get single appointment
router.get('/:id', (req, res) => {
  try {
    const appointment = db.prepare(`
      SELECT
        a.*,
        p.first_name || ' ' || p.last_name as patient_name,
        p.phone as patient_phone,
        t.name as therapist_name,
        t.color as therapist_color
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      LEFT JOIN therapists t ON a.therapist_id = t.id
      WHERE a.id = ?
    `).get(req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Termin nicht gefunden' });
    }
    res.json({ success: true, data: appointment });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Laden des Termins:', 'Termin konnte nicht geladen werden.');
  }
});

// Create appointment
router.post('/', validateBody(appointmentSchema), (req, res) => {
  const { patient_id, therapist_id, date, time_start, time_end, treatment_type, notes, sms_reminder } = req.body;

  if (time_end <= time_start) {
    return res.status(400).json({
      success: false,
      error: 'Endzeit muss nach Startzeit liegen'
    });
  }

  try {
    const overlapping = db.prepare(`
      SELECT id
      FROM appointments
      WHERE therapist_id IS ?
        AND date = ?
        AND status != 'cancelled'
        AND NOT (time_end <= ? OR time_start >= ?)
    `).get(therapist_id || null, date, time_start, time_end) as { id: number } | undefined;

    if (overlapping) {
      return res.status(409).json({
        success: false,
        error: 'Für diese/n Therapeut/in besteht in diesem Zeitraum bereits ein Termin',
      });
    }

    const result = db.prepare(`
      INSERT INTO appointments (patient_id, therapist_id, date, time_start, time_end, treatment_type, notes, sms_reminder)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(patient_id, therapist_id || null, date, time_start, time_end, treatment_type, notes || null, sms_reminder || 0);

    const appointment = db.prepare(`
      SELECT
        a.*,
        p.first_name || ' ' || p.last_name as patient_name,
        p.phone as patient_phone,
        t.name as therapist_name,
        t.color as therapist_color
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      LEFT JOIN therapists t ON a.therapist_id = t.id
      WHERE a.id = ?
    `).get(result.lastInsertRowid);

    const ctx = getAuditContext(req);
    logAudit({ ...ctx, action: 'create', entity_type: 'appointment', entity_id: result.lastInsertRowid, new_value: safeJson(appointment), success: true });

    res.status(201).json({ success: true, data: appointment });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Erstellen des Termins:', 'Termin konnte nicht angelegt werden.');
  }
});

// Update appointment
router.put('/:id', validateBody(appointmentUpdateSchema), (req, res) => {
  const { patient_id, therapist_id, date, time_start, time_end, treatment_type, notes, sms_reminder } = req.body;
  const { id } = req.params;

  if (time_start && time_end && time_end <= time_start) {
    return res.status(400).json({
      success: false,
      error: 'Endzeit muss nach Startzeit liegen'
    });
  }

  try {
    const overlapping = db.prepare(`
      SELECT id
      FROM appointments
      WHERE therapist_id IS ?
        AND date = ?
        AND status != 'cancelled'
        AND id != ?
        AND NOT (time_end <= ? OR time_start >= ?)
    `).get(therapist_id || null, date, id, time_start, time_end) as { id: number } | undefined;

    if (overlapping) {
      return res.status(409).json({
        success: false,
        error: 'Für diese/n Therapeut/in besteht in diesem Zeitraum bereits ein Termin',
      });
    }

    const old = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);

    const result = db.prepare(`
      UPDATE appointments
      SET patient_id = ?, therapist_id = ?, date = ?, time_start = ?, time_end = ?,
          treatment_type = ?, notes = ?, sms_reminder = ?
      WHERE id = ?
    `).run(patient_id, therapist_id || null, date, time_start, time_end, treatment_type, notes || null, sms_reminder ?? 0, id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Termin nicht gefunden' });
    }

    const appointment = db.prepare(`
      SELECT
        a.*,
        p.first_name || ' ' || p.last_name as patient_name,
        p.phone as patient_phone,
        t.name as therapist_name,
        t.color as therapist_color
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      LEFT JOIN therapists t ON a.therapist_id = t.id
      WHERE a.id = ?
    `).get(id);

    const ctx = getAuditContext(req);
    logAudit({ ...ctx, action: 'update', entity_type: 'appointment', entity_id: id, old_value: safeJson(old), new_value: safeJson(appointment), success: true });

    res.json({ success: true, data: appointment });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Aktualisieren des Termins:', 'Termin konnte nicht aktualisiert werden.');
  }
});

// Cancel appointment
router.post('/:id/cancel', (req, res) => {
  try {
    const existing = db.prepare('SELECT status FROM appointments WHERE id = ?').get(req.params.id) as { status: string } | undefined;
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Termin nicht gefunden' });
    }
    if (existing.status === 'cancelled') {
      const appointment = db.prepare(`
        SELECT
          a.*,
          p.first_name || ' ' || p.last_name as patient_name,
          p.phone as patient_phone,
          t.name as therapist_name,
          t.color as therapist_color
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        LEFT JOIN therapists t ON a.therapist_id = t.id
        WHERE a.id = ?
      `).get(req.params.id);
      return res.json({ success: true, data: appointment });
    }
    const old = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
    db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run('cancelled', req.params.id);
    const appointment = db.prepare(`
      SELECT
        a.*,
        p.first_name || ' ' || p.last_name as patient_name,
        p.phone as patient_phone,
        t.name as therapist_name,
        t.color as therapist_color
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      LEFT JOIN therapists t ON a.therapist_id = t.id
      WHERE a.id = ?
    `).get(req.params.id);
    const ctx = getAuditContext(req);
    logAudit({ ...ctx, action: 'cancel', entity_type: 'appointment', entity_id: req.params.id, old_value: safeJson(old), new_value: safeJson(appointment), success: true });
    res.json({ success: true, data: appointment });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Absagen des Termins:', 'Termin konnte nicht abgesagt werden.');
  }
});

// Delete appointment
router.delete('/:id', requireRole('admin'), (req, res) => {
  try {
    const old = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
    const result = db.prepare('DELETE FROM appointments WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Termin nicht gefunden' });
    }
    const ctx = getAuditContext(req);
    logAudit({ ...ctx, action: 'delete', entity_type: 'appointment', entity_id: req.params.id, old_value: safeJson(old), success: true });
    res.json({ success: true, message: 'Termin erfolgreich gelöscht' });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Löschen des Termins:', 'Termin konnte nicht gelöscht werden.');
  }
});

export default router;
