import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

function toDateOnlyString(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
  const { date, patient_id, therapist_id, view } = req.query;

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
  const params: any[] = [];

  if (date && !view) {
    // Legacy: single date filter (backward compat)
    query += ' AND a.date = ?';
    params.push(date);
  } else if (date && view === 'week') {
    // Week view: get Monday-Sunday of the week containing `date`
    const d = new Date(String(date));
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (dt: Date) => dt.toISOString().slice(0, 10);
    query += ' AND a.date >= ? AND a.date <= ?';
    params.push(fmt(monday), fmt(sunday));
  } else if (date && view === 'month') {
    // Month view: get all days of the month containing `date`
    const [year, month] = String(date).split('-').map(Number);
    const start = `${String(year)}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${String(year)}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    query += ' AND a.date >= ? AND a.date <= ?';
    params.push(start, end);
  } else if (date) {
    // Single date filter (backward compat when no view param)
    query += ' AND a.date = ?';
    params.push(date);
  }

  if (patient_id) {
    query += ' AND a.patient_id = ?';
    params.push(patient_id);
  }

  if (therapist_id) {
    query += ' AND a.therapist_id = ?';
    params.push(therapist_id);
  }
  
  query += ' ORDER BY a.date, a.time_start';
  
  try {
    const appointments = db.prepare(query).all(...params);
    res.json({ success: true, data: appointments });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/ical', (_req, res) => {
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
    res.status(500).json({ success: false, error: (error as Error).message });
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
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Create appointment
router.post('/', (req, res) => {
  const { patient_id, therapist_id, date, time_start, time_end, treatment_type, notes, sms_reminder } = req.body;
  
  if (!patient_id || !date || !time_start || !time_end || !treatment_type) {
    return res.status(400).json({ 
      success: false, 
      error: 'Patient, Datum, Zeit und Behandlungstyp sind erforderlich' 
    });
  }
  
  // Validate time range
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
    
    res.status(201).json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Update appointment
router.put('/:id', (req, res) => {
  const { patient_id, therapist_id, date, time_start, time_end, treatment_type, notes, sms_reminder } = req.body;
  const { id } = req.params;
  
  // Validate time range if both times are provided
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
    
    res.json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Cancel appointment
router.post('/:id/cancel', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
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
    res.json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Delete appointment
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM appointments WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Termin nicht gefunden' });
    }
    res.json({ success: true, message: 'Termin erfolgreich gelöscht' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
