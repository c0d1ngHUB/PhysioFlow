import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

const PATIENT_SELECT = `
  SELECT *
  FROM patients
`;

function normalizePatient(patient: any) {
  if (!patient) return patient;

  return {
    ...patient,
    is_archived: Boolean(patient.is_archived),
  };
}

function parsePatientStatus(query: Record<string, unknown>): 'active' | 'archived' | 'all' {
  if (query.archivedOnly === 'true' || query.archivedOnly === true) return 'archived';
  if (query.includeArchived === 'true' || query.includeArchived === true) return 'all';
  if (query.status === 'archived' || query.archived === 'only' || query.only_archived === 'true') return 'archived';
  if (
    query.status === 'all' ||
    query.status === 'include_archived' ||
    query.includeArchived === '1' ||
    query.include_archived === 'true' ||
    query.archived === 'true'
  ) return 'all';
  return 'active';
}

function parseTreatmentServices(rawValue: unknown) {
  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
    return [];
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return rawValue;
  }
}

function shouldIncludeCancelled(query: Record<string, unknown>) {
  return query.include_cancelled === 'true' ||
    query.includeCancelled === 'true' ||
    query.status === 'all';
}

// Get all patients
router.get('/', (req, res) => {
  try {
    const status = parsePatientStatus(req.query as Record<string, unknown>);

    let query = `${PATIENT_SELECT}`;
    if (status === 'active') {
      query += ' WHERE is_archived = 0';
    } else if (status === 'archived') {
      query += ' WHERE is_archived = 1';
    }

    query += ' ORDER BY is_archived ASC, last_name, first_name';

    const patients = db.prepare(query).all();
    res.json({ success: true, data: patients.map(normalizePatient) });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Export patient as JSON
router.get('/:id/export', (req, res) => {
  const { id } = req.params;
  const includeCancelled = shouldIncludeCancelled(req.query as Record<string, unknown>);

  try {
    const patient = db.prepare(`${PATIENT_SELECT} WHERE id = ?`).get(id) as any;
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient nicht gefunden' });
    }

    const appointments = db.prepare(`
      SELECT *
      FROM appointments
      WHERE patient_id = ?${includeCancelled ? '' : " AND status != 'cancelled'"}
      ORDER BY date DESC, time_start DESC
    `).all(id).map((appointment: any) => ({
      ...appointment,
      treatment_services: parseTreatmentServices(appointment.treatment_services),
    }));

    const invoices = db.prepare(`
      SELECT *
      FROM invoices
      WHERE patient_id = ?
      ORDER BY created_at DESC
    `).all(id);

    const normalizedPatient = normalizePatient(patient);
    const treatmentHistory = appointments
      .filter((appointment: any) =>
        appointment.notes ||
        appointment.treatment_notes ||
        (Array.isArray(appointment.treatment_services) && appointment.treatment_services.length > 0) ||
        appointment.next_appointment_date ||
        appointment.treatment_completed_at
      )
      .map((appointment: any) => ({
        appointment_id: appointment.id,
        date: appointment.date,
        time_start: appointment.time_start,
        time_end: appointment.time_end,
        treatment_type: appointment.treatment_type,
        appointment_notes: appointment.notes,
        treatment_notes: appointment.treatment_notes,
        treatment_services: appointment.treatment_services,
        next_appointment_date: appointment.next_appointment_date,
        treatment_completed_at: appointment.treatment_completed_at,
      }));

    const payload = {
      exported_at: new Date().toISOString(),
      patient: normalizedPatient,
      appointments,
      invoices,
      treatment_history: treatmentHistory,
    };

    const safeName = `${patient.last_name}_${patient.first_name}`.replace(/[^a-zA-Z0-9_-]+/g, '_');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="patient-export-${safeName}-${id}.json"`);
    res.send(JSON.stringify(payload, null, 2));
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Get single patient
router.get('/:id', (req, res) => {
  try {
    const patient = db.prepare(`${PATIENT_SELECT} WHERE id = ?`).get(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }
    res.json({ success: true, data: normalizePatient(patient) });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Create patient
router.post('/', (req, res) => {
  const { first_name, last_name, phone, email, birthdate, notes, insurance_number, address } = req.body;
  
  if (!first_name || !last_name) {
    return res.status(400).json({ success: false, error: 'Vorname und Nachname sind erforderlich' });
  }
  
  try {
    const result = db.prepare(`
      INSERT INTO patients (first_name, last_name, phone, email, birthdate, notes, insurance_number, address, is_archived, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)
    `).run(
      first_name,
      last_name,
      phone || null,
      email || null,
      birthdate || null,
      notes || null,
      insurance_number || null,
      address || null
    );
    
    const patient = db.prepare(`${PATIENT_SELECT} WHERE id = ?`).get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: normalizePatient(patient) });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Update patient
router.put('/:id', (req, res) => {
  const { first_name, last_name, phone, email, birthdate, notes, insurance_number, address } = req.body;
  const { id } = req.params;
  
  try {
    const result = db.prepare(`
      UPDATE patients 
      SET first_name = ?, last_name = ?, phone = ?, email = ?, birthdate = ?, notes = ?, insurance_number = ?, address = ?
      WHERE id = ?
    `).run(first_name, last_name, phone, email, birthdate, notes, insurance_number, address, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Patient nicht gefunden' });
    }
    
    const patient = db.prepare(`${PATIENT_SELECT} WHERE id = ?`).get(id);
    res.json({ success: true, data: normalizePatient(patient) });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Archive patient
router.post('/:id/archive', (req, res) => {
  const { id } = req.params;

  try {
    const result = db.prepare(`
      UPDATE patients
      SET is_archived = 1,
          archived_at = datetime('now')
      WHERE id = ?
    `).run(id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Patient nicht gefunden' });
    }

    const patient = db.prepare(`${PATIENT_SELECT} WHERE id = ?`).get(id);
    res.json({ success: true, data: normalizePatient(patient) });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Unarchive patient
router.post('/:id/unarchive', (req, res) => {
  const { id } = req.params;

  try {
    const result = db.prepare(`
      UPDATE patients
      SET is_archived = 0,
          archived_at = NULL
      WHERE id = ?
    `).run(id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Patient nicht gefunden' });
    }

    const patient = db.prepare(`${PATIENT_SELECT} WHERE id = ?`).get(id);
    res.json({ success: true, data: normalizePatient(patient) });
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

// Get patient history (appointments + invoices)
router.get('/:id/history', (req, res) => {
  const { id } = req.params;
  const includeCancelled = shouldIncludeCancelled(req.query as Record<string, unknown>);

  try {
    // Patient details
    const patient = db.prepare(`${PATIENT_SELECT} WHERE id = ?`).get(id);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient nicht gefunden' });
    }

    // Appointments for this patient
    const appointments = db.prepare(`
      SELECT * FROM appointments
      WHERE patient_id = ?${includeCancelled ? '' : " AND status != 'cancelled'"}
      ORDER BY date DESC, time_start DESC
    `).all(id).map((appointment: any) => ({
      ...appointment,
      treatment_services: parseTreatmentServices(appointment.treatment_services),
    }));

    // Invoices for this patient
    const invoices = db.prepare(`
      SELECT * FROM invoices
      WHERE patient_id = ?
      ORDER BY created_at DESC
    `).all(id);

    res.json({ success: true, data: { patient: normalizePatient(patient), appointments, invoices } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
