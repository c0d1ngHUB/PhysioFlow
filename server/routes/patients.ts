import { Router } from 'express';
import db from '../db/index.js';
import { requireRole } from '../utils/auth.js';
import { respondWithServerError } from '../utils/httpErrors.js';

const router = Router();

// Ensure newer columns exist (idempotent for existing databases)
try {
  db.prepare('ALTER TABLE patients ADD COLUMN insurance_number TEXT').run();
} catch { /* column already exists */ }
try {
  db.prepare('ALTER TABLE patients ADD COLUMN address TEXT').run();
} catch { /* column already exists */ }

// Get all patients
router.get('/', (_req, res) => {
  try {
    const patients = db.prepare('SELECT * FROM patients ORDER BY last_name, first_name').all();
    res.json({ success: true, data: patients });
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
router.post('/', requireRole('admin'), (req, res) => {
  const { first_name, last_name, phone, email, birthdate, notes, address, insurance_number } = req.body;
  
  if (!first_name || !last_name) {
    return res.status(400).json({ success: false, error: 'Vorname und Nachname sind erforderlich' });
  }
  
  try {
    const result = db.prepare(`
      INSERT INTO patients (first_name, last_name, phone, email, birthdate, notes, address, insurance_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(first_name, last_name, phone || null, email || null, birthdate || null, notes || null, address || null, insurance_number || null);
    
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: patient });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Erstellen des Patienten:', 'Patient/in konnte nicht angelegt werden.');
  }
});

// Update patient
router.put('/:id', requireRole('admin'), (req, res) => {
  const { first_name, last_name, phone, email, birthdate, notes, address, insurance_number } = req.body;
  const { id } = req.params;
  
  try {
    const result = db.prepare(`
      UPDATE patients 
      SET first_name = ?, last_name = ?, phone = ?, email = ?, birthdate = ?, notes = ?, address = ?, insurance_number = ?
      WHERE id = ?
    `).run(first_name, last_name, phone, email, birthdate, notes, address, insurance_number, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Patient nicht gefunden' });
    }
    
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
    res.json({ success: true, data: patient });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Aktualisieren des Patienten:', 'Patient/in konnte nicht aktualisiert werden.');
  }
});

// Delete patient
router.delete('/:id', requireRole('admin'), (req, res) => {
  try {
    const result = db.prepare('DELETE FROM patients WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Patient nicht gefunden' });
    }
    res.json({ success: true, message: 'Patient erfolgreich gelöscht' });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Löschen des Patienten:', 'Patient/in konnte nicht gelöscht werden.');
  }
});

// Get patient history (appointments + invoices)
router.get('/:id/history', (req, res) => {
  const { id } = req.params;

  try {
    // Patient details
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient nicht gefunden' });
    }

    // Appointments for this patient
    const appointments = db.prepare(`
      SELECT * FROM appointments
      WHERE patient_id = ?
      ORDER BY date DESC, time_start DESC
    `).all(id);

    // Invoices for this patient
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
