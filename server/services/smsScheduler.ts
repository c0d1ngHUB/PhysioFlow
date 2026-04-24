// SMS Scheduler Service - runs automatically via cron
import db from '../db/index.js';
import { formatPhone, sendSms } from './sms.js';

interface ScheduledSMS {
  appointment_id: number;
  patient_name: string;
  patient_phone: string;
  appointment_date: string;
  appointment_time: string;
}

/**
 * Check for scheduled SMS that need to be sent
 * Called automatically by cron job every hour
 */
export async function processScheduledSMS(): Promise<{ sent: number; failed: number }> {
  const result = { sent: 0, failed: 0 };
  
  // Find appointments where SMS should be sent (within next hour, scheduled status)
  const scheduledSMS = db.prepare(`
    SELECT 
      a.id as appointment_id,
      p.first_name || ' ' || p.last_name as patient_name,
      p.phone as patient_phone,
      a.date as appointment_date,
      a.time_start as appointment_time
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE a.sms_reminder = 2
      AND datetime(a.date || ' ' || a.time_start) > datetime('now')
      AND datetime(a.date || ' ' || a.time_start) <= datetime('now', '+24 hours')
      AND datetime(a.date || ' ' || a.time_start) >= datetime('now', '+23 hours')
      AND p.phone IS NOT NULL
      AND p.phone != ''
    ORDER BY datetime(a.date || ' ' || a.time_start) ASC
  `).all() as ScheduledSMS[];
  
  console.log(`[SMS Scheduler] Found ${scheduledSMS.length} scheduled reminders to process`);
  
  for (const sms of scheduledSMS) {
    try {
      const phone = formatPhone(sms.patient_phone);
      
      const message = `Hallo ${sms.patient_name.split(' ')[0]}, wir sehen uns morgen um ${sms.appointment_time.slice(0, 5)} Uhr in der Praxis. Bitte bringen Sie Ihre Versichertenkarte mit. Ihr PhysioFlow`;
      
      await sendSms({ to: phone, text: message });
      result.sent++;
      
      // Mark as sent
      db.prepare('UPDATE appointments SET sms_reminder = 1 WHERE id = ?').run(sms.appointment_id);
      db.prepare(`
        UPDATE sms_log
        SET status = ?, sent_at = datetime('now'), message = ?
        WHERE appointment_id = ? AND status = 'scheduled'
      `).run('sent', `Erfolgreich versendet an ${phone}`, sms.appointment_id);
    } catch (error) {
      result.failed++;
      console.error(`[SMS Scheduler] Failed to send to ${sms.patient_name}:`, error);
      
      // Mark as failed
      db.prepare('UPDATE appointments SET sms_reminder = 3 WHERE id = ?').run(sms.appointment_id);
      db.prepare(`
        UPDATE sms_log
        SET status = ?, sent_at = datetime('now'), message = ?
        WHERE appointment_id = ? AND status = 'scheduled'
      `).run('failed', (error as Error).message, sms.appointment_id);
    }
  }
  
  return result;
}

/**
 * Get statistics for SMS sent today
 */
export function getSMSStats(): { sent: number; scheduled: number; failed: number } {
  const sent = db.prepare(`SELECT COUNT(*) as count FROM sms_log WHERE status = 'sent' AND date(sent_at) = date('now')`).get() as { count: number };
  const scheduled = db.prepare(`SELECT COUNT(*) as count FROM sms_log WHERE status = 'scheduled'`).get() as { count: number };
  const failed = db.prepare(`SELECT COUNT(*) as count FROM sms_log WHERE status = 'failed' AND date(sent_at) = date('now')`).get() as { count: number };
  
  return {
    sent: sent?.count || 0,
    scheduled: scheduled?.count || 0,
    failed: failed?.count || 0
  };
}

/**
 * Manual trigger - for testing or admin use
 */
export async function sendManualSMS(appointmentId: number): Promise<{ success: boolean; error?: string }> {
  const appointment = db.prepare(`
    SELECT 
      a.id as appointment_id,
      p.first_name || ' ' || p.last_name as patient_name,
      p.phone as patient_phone,
      a.date as appointment_date,
      a.time_start as appointment_time
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE a.id = ?
  `).get(appointmentId) as ScheduledSMS | undefined;
  
  if (!appointment) {
    return { success: false, error: 'Termin nicht gefunden' };
  }
  
  if (!appointment.patient_phone) {
    return { success: false, error: 'Patient hat keine Telefonnummer' };
  }
  
  try {
    const phone = formatPhone(appointment.patient_phone);
    const message = `Hallo ${appointment.patient_name.split(' ')[0]}, wir sehen uns morgen um ${appointment.appointment_time.slice(0, 5)} Uhr in der Praxis. Bitte bringen Sie Ihre Versichertenkarte mit. Ihr PhysioFlow`;
    await sendSms({ to: phone, text: message });
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
