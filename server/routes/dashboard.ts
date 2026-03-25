import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

// Get dashboard statistics
router.get('/', (_req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    
    // Today's appointments
    const todayAppointments = db.prepare(`
      SELECT COUNT(*) as count FROM appointments WHERE date = ?
    `).get(today) as { count: number };
    
    // Upcoming appointments (next 7 days)
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const weekFromNowStr = weekFromNow.toISOString().slice(0, 10);
    
    const upcomingAppointments = db.prepare(`
      SELECT COUNT(*) as count FROM appointments 
      WHERE date >= ? AND date <= ? AND date != ?
    `).get(today, weekFromNowStr, today) as { count: number };
    
    // Unpaid invoices
    const unpaidInvoices = db.prepare(`
      SELECT COUNT(*) as count, SUM(total) as total FROM invoices WHERE paid = 0
    `).get() as { count: number; total: number };
    
    // Total patients
    const totalPatients = db.prepare(`
      SELECT COUNT(*) as count FROM patients
    `).get() as { count: number };
    
    // Today's appointment details
    const todayDetails = db.prepare(`
      SELECT a.*, p.first_name || ' ' || p.last_name as patient_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.date = ?
      ORDER BY a.time_start
    `).all(today);
    
    res.json({
      success: true,
      data: {
        today_appointments: todayAppointments.count,
        upcoming_appointments: upcomingAppointments.count,
        unpaid_invoices: unpaidInvoices.count,
        unpaid_invoices_total: unpaidInvoices.total || 0,
        total_patients: totalPatients.count,
        today_details: todayDetails
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
