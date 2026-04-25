import { Router } from 'express';
import db from '../db/index.js';
import { formatPhone, getSmsProviderStatus, sendSms } from '../services/sms.js';
import { requireRole } from '../utils/auth.js';
import { respondWithServerError } from '../utils/httpErrors.js';

const router = Router();

// Send SMS reminder
router.post('/send', requireRole('admin'), async (req, res) => {
  const { to, patient_name, appointment_date, appointment_time } = req.body;
  
  if (!to || !patient_name || !appointment_date || !appointment_time) {
    return res.status(400).json({ 
      success: false, 
      error: 'Telefonnummer, Name, Datum und Zeit sind erforderlich' 
    });
  }
  
  let phone: string;
  try {
    phone = formatPhone(to);
  } catch (error) {
    console.error('Ungültige Telefonnummer für SMS:', error);
    return res.status(400).json({
      success: false,
      error: 'Telefonnummer ist ungültig.',
    });
  }
  
  // Create personalized message
  const message = `Hallo ${patient_name}, wir sehen uns am ${appointment_date} um ${appointment_time} in der Praxis. Bitte bringen Sie Ihre Versichertenkarte mit. Ihr PhysioFlow`;
  
  try {
    const result = await sendSms({ to: phone, text: message });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Fehler beim Senden der SMS:', error);
    res.status(502).json({ success: false, error: 'SMS konnte nicht gesendet werden.' });
  }
});

router.get('/status', (_req, res) => {
  res.json({ success: true, data: getSmsProviderStatus() });
});

// Schedule SMS reminder for appointment (24h before)
router.post('/schedule', requireRole('admin'), (req, res) => {
  const { appointment_id } = req.body;
  
  if (!appointment_id) {
    return res.status(400).json({ 
      success: false, 
      error: 'appointment_id ist erforderlich' 
    });
  }
  
  try {
    // Get appointment with patient details
    const appointment = db.prepare(`
      SELECT a.*, p.first_name || ' ' || p.last_name as patient_name, p.phone as patient_phone
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.id = ?
    `).get(appointment_id) as { date: string; time_start: string; patient_name: string; patient_phone: string } | undefined;
    
    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Termin nicht gefunden' });
    }
    
    if (!appointment.patient_phone) {
      return res.status(400).json({ 
        success: false, 
        error: 'Patient hat keine Telefonnummer hinterlegt' 
      });
    }
    
    // Calculate 24h before appointment
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.time_start}`);
    const reminderTime = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000);
    
    // Log the scheduled reminder
    db.prepare(`
      INSERT INTO sms_log (appointment_id, status, message)
      VALUES (?, 'scheduled', ?)
    `).run(appointment_id, `Geplant für ${reminderTime.toISOString()}`);
    
    // Update appointment reminder status
    db.prepare('UPDATE appointments SET sms_reminder = 2 WHERE id = ?').run(appointment_id);
    
    res.json({ 
      success: true, 
      data: {
        appointment_id,
        reminder_time: reminderTime.toISOString(),
        patient_name: appointment.patient_name,
        phone: appointment.patient_phone
      }
    });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Planen der SMS:', 'SMS-Erinnerung konnte nicht geplant werden.');
  }
});

// Get SMS log for appointment
router.get('/log/:appointmentId', (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT * FROM sms_log WHERE appointment_id = ? ORDER BY sent_at DESC
    `).all(req.params.appointmentId);
    
    res.json({ success: true, data: logs });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Laden des SMS-Protokolls:', 'SMS-Protokoll konnte nicht geladen werden.');
  }
});

export default router;
