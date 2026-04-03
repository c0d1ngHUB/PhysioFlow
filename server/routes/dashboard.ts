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

    // This month appointments
    const thisMonthStart = today.slice(0, 7) + '-01';
    const thisMonthAppointments = db.prepare(`
      SELECT COUNT(*) as count FROM appointments WHERE date >= ? AND date <= ?
    `).get(thisMonthStart, today) as { count: number };

    // Upcoming this week (next 7 days including today)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekStartStr = weekStart.toISOString().slice(0, 10);
    const upcomingThisWeek = db.prepare(`
      SELECT a.*, p.first_name || ' ' || p.last_name as patient_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.date >= ? AND a.date <= ?
      ORDER BY a.date, a.time_start
    `).all(weekStartStr, weekFromNowStr);

    // Monthly revenue — this month (paid invoices)
    const thisMonthRevenue = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total FROM invoices
      WHERE paid = 1 AND created_at >= ?
    `).get(thisMonthStart) as { total: number };

    // Monthly revenue — last month
    const lastMonthDate = new Date(today);
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonthStart = lastMonthDate.toISOString().slice(0, 7) + '-01';
    const lastMonthEnd = lastMonthDate.toISOString().slice(0, 7) + '-' +
      String(new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 0).getDate()).padStart(2, '0');
    const lastMonthRevenue = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total FROM invoices
      WHERE paid = 1 AND created_at >= ? AND created_at < ?
    `).get(lastMonthStart, lastMonthStart.slice(0, 7) + '-' + String(new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 0).getDate() + 1).padStart(2, '0') + 'T00:00:00') as { total: number };

    // Last 6 months revenue for chart
    const sixMonthsRevenue: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today);
      d.setMonth(d.getMonth() - i);
      const mStart = d.toISOString().slice(0, 7) + '-01';
      const mEnd = d.toISOString().slice(0, 7) + '-' + String(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()).padStart(2, '0');
      const monthName = d.toLocaleDateString('de-AT', { month: 'short', year: '2-digit' });
      const rev = db.prepare(`
        SELECT COALESCE(SUM(total), 0) as total FROM invoices
        WHERE paid = 1 AND created_at >= ? AND created_at <= ?
      `).get(mStart, mEnd + 'T23:59:59') as { total: number };
      sixMonthsRevenue.push({ month: monthName, revenue: rev.total });
    }

    res.json({
      success: true,
      data: {
        today_appointments: todayAppointments.count,
        upcoming_appointments: upcomingAppointments.count,
        unpaid_invoices: unpaidInvoices.count,
        unpaid_invoices_total: unpaidInvoices.total || 0,
        total_patients: totalPatients.count,
        today_details: todayDetails,
        this_month_appointments: thisMonthAppointments.count,
        this_month_revenue: thisMonthRevenue.total,
        last_month_revenue: lastMonthRevenue.total,
        upcoming_this_week: upcomingThisWeek,
        six_months_revenue: sixMonthsRevenue
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
