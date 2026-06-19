import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

function shouldIncludeCancelled(query: Record<string, unknown>) {
  return query.include_cancelled === 'true' ||
    query.includeCancelled === 'true' ||
    query.status === 'all';
}

// Get all appointments (with optional date/week/month filter)
router.get('/', (req, res) => {
  const { date, patient_id, view } = req.query;
  const includeCancelled = shouldIncludeCancelled(req.query as Record<string, unknown>);

  let query = `
    SELECT a.*, p.first_name || ' ' || p.last_name as patient_name, p.phone as patient_phone
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (!includeCancelled) {
    query += " AND a.status != 'cancelled'";
  }

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
  
  query += ' ORDER BY a.date, a.time_start';
  
  try {
    const appointments = db.prepare(query).all(...params);
    res.json({ success: true, data: appointments });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Get single appointment
router.get('/:id', (req, res) => {
  try {
    const includeCancelled = shouldIncludeCancelled(req.query as Record<string, unknown>);
    const appointment = db.prepare(`
      SELECT a.*, p.first_name || ' ' || p.last_name as patient_name, p.phone as patient_phone
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.id = ?${includeCancelled ? '' : " AND a.status != 'cancelled'"}
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
  const { patient_id, date, time_start, time_end, treatment_type, notes, sms_reminder } = req.body;
  
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
    const result = db.prepare(`
      INSERT INTO appointments (patient_id, date, time_start, time_end, treatment_type, notes, sms_reminder)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(patient_id, date, time_start, time_end, treatment_type, notes || null, sms_reminder || 0);
    
    const appointment = db.prepare(`
      SELECT a.*, p.first_name || ' ' || p.last_name as patient_name, p.phone as patient_phone
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.id = ?
    `).get(result.lastInsertRowid);
    
    res.status(201).json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Update appointment
router.put('/:id', (req, res) => {
  const { patient_id, date, time_start, time_end, treatment_type, notes, sms_reminder } = req.body;
  const { id } = req.params;
  
  // Validate time range if both times are provided
  if (time_start && time_end && time_end <= time_start) {
    return res.status(400).json({ 
      success: false, 
      error: 'Endzeit muss nach Startzeit liegen' 
    });
  }
  
  try {
    const result = db.prepare(`
      UPDATE appointments 
      SET patient_id = ?, date = ?, time_start = ?, time_end = ?, 
          treatment_type = ?, notes = ?, sms_reminder = ?
      WHERE id = ?
    `).run(patient_id, date, time_start, time_end, treatment_type, notes, sms_reminder, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Termin nicht gefunden' });
    }
    
    const appointment = db.prepare(`
      SELECT a.*, p.first_name || ' ' || p.last_name as patient_name, p.phone as patient_phone
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.id = ?
    `).get(id);
    
    res.json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Save treatment data for an appointment
router.put('/:id/treatment', (req, res) => {
  const { id } = req.params;
  const { treatment_notes, treatment_services, next_appointment_date } = req.body;

  try {
    const result = db.prepare(`
      UPDATE appointments
      SET treatment_notes = ?,
          treatment_services = ?,
          next_appointment_date = ?,
          treatment_completed_at = datetime('now')
      WHERE id = ?
    `).run(
      treatment_notes || null,
      JSON.stringify(Array.isArray(treatment_services) ? treatment_services : []),
      next_appointment_date || null,
      id
    );

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Termin nicht gefunden' });
    }

    const appointment = db.prepare(`
      SELECT a.*, p.first_name || ' ' || p.last_name as patient_name, p.phone as patient_phone
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.id = ?
    `).get(id);

    res.json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Delete appointment
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare(`
      UPDATE appointments
      SET status = 'cancelled'
      WHERE id = ? AND status != 'cancelled'
    `).run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Termin nicht gefunden' });
    }
    res.json({ success: true, message: 'Termin erfolgreich gelöscht' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Cancel appointment (frontend compatibility)
router.post('/:id/cancel', (req, res) => {
  try {
    const result = db.prepare(`
      UPDATE appointments
      SET status = 'cancelled'
      WHERE id = ? AND status != 'cancelled'
    `).run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Termin nicht gefunden' });
    }
    res.json({ success: true, message: 'Termin erfolgreich abgesagt' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
