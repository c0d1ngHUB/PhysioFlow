import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

// SMS77.de API configuration
const SMS77_API_KEY = process.env.SMS77_API_KEY || '';
const SMS77_URL = 'https://rest.sms77.de/api';

// Send SMS reminder
router.post('/send', async (req, res) => {
  const { to, patient_name, appointment_date, appointment_time } = req.body;
  
  if (!to || !patient_name || !appointment_date || !appointment_time) {
    return res.status(400).json({ 
      success: false, 
      error: 'Telefonnummer, Name, Datum und Zeit sind erforderlich' 
    });
  }
  
  // Format phone number (remove spaces, + sign)
  const phone = to.replace(/[\s+]/g, '').replace(/^0/, '+43');
  
  // Create personalized message
  const message = `Hallo ${patient_name}, wir sehen uns am ${appointment_date} um ${appointment_time} in der Praxis. Bitte bringen Sie Ihre Versichertenkarte mit. Ihr PhysioFlow`;
  
  // If no API key, simulate sending
  if (!SMS77_API_KEY) {
    console.log('📱 [SIMULATED SMS] To:', phone);
    console.log('📱 [SIMULATED SMS] Message:', message);
    
    return res.json({ 
      success: true, 
      data: { 
        id: 'sim_' + Date.now(),
        to: phone,
        message,
        status: 'simulated',
        simulated: true
      }
    });
  }
  
  try {
    const params = new URLSearchParams({
      p: SMS77_API_KEY,
      to: phone,
      text: message,
      from: 'PhysioFlow'
    });
    
    const response = await fetch(`${SMS77_URL}/sms?${params}`, {
      method: 'GET'
    });
    
    const result = await response.text();
    
    if (response.ok) {
      res.json({ 
        success: true, 
        data: { 
          id: result,
          to: phone,
          message,
          status: 'sent'
        }
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: 'SMS konnte nicht gesendet werden',
        details: result
      });
    }
  } catch (error) {
    console.error('SMS Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Fehler beim Senden der SMS'
    });
  }
});

// Schedule SMS reminder for appointment (24h before)
router.post('/schedule', (req, res) => {
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
    `).get(appointment_id) as any;
    
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
    res.status(500).json({ success: false, error: (error as Error).message });
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
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
