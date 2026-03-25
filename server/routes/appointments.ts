import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

// Get all appointments (with optional date filter)
router.get('/', (req, res) => {
  const { date, patient_id } = req.query;
  
  let query = `
    SELECT a.*, p.first_name || ' ' || p.last_name as patient_name, p.phone as patient_phone
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE 1=1
  `;
  const params: any[] = [];
  
  if (date) {
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
    const appointment = db.prepare(`
      SELECT a.*, p.first_name || ' ' || p.last_name as patient_name, p.phone as patient_phone
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
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
