import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

// Get all patients
router.get('/', (_req, res) => {
  try {
    const patients = db.prepare('SELECT * FROM patients ORDER BY last_name, first_name').all();
    res.json({ success: true, data: patients });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Get single patient
router.get('/:id', (req, res) => {
  try {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }
    res.json({ success: true, data: patient });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Create patient
router.post('/', (req, res) => {
  const { first_name, last_name, phone, email, birthdate, notes } = req.body;
  
  if (!first_name || !last_name) {
    return res.status(400).json({ success: false, error: 'Vorname und Nachname sind erforderlich' });
  }
  
  try {
    const result = db.prepare(`
      INSERT INTO patients (first_name, last_name, phone, email, birthdate, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(first_name, last_name, phone || null, email || null, birthdate || null, notes || null);
    
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: patient });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Update patient
router.put('/:id', (req, res) => {
  const { first_name, last_name, phone, email, birthdate, notes } = req.body;
  const { id } = req.params;
  
  try {
    const result = db.prepare(`
      UPDATE patients 
      SET first_name = ?, last_name = ?, phone = ?, email = ?, birthdate = ?, notes = ?
      WHERE id = ?
    `).run(first_name, last_name, phone ?? null, email ?? null, birthdate ?? null, notes ?? null, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Patient nicht gefunden' });
    }
    
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
    res.json({ success: true, data: patient });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Delete patient
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM patients WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Patient nicht gefunden' });
    }
    res.json({ success: true, message: 'Patient erfolgreich gelöscht' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
