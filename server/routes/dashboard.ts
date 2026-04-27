import { Router } from 'express';
import db from '../db/index.js';
import { respondWithServerError } from '../utils/httpErrors.js';
import { toLocalDateStr, todayStr, getWeekRange } from '../utils/date.js';

const router = Router();

// Get dashboard statistics
router.get('/', (req, res) => {
  try {
    const selectedDate = typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
      ? req.query.date
      : todayStr();
    const today = todayStr();

    const thisMonthStart = today.slice(0, 7) + '-01';

    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStart = toLocalDateStr(lastMonth);

    const { weekStart, weekEnd } = getWeekRange(selectedDate);

    const stats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM appointments WHERE date = ? AND status != 'cancelled') AS today_appointments,
        (SELECT COUNT(*) FROM appointments WHERE date >= ? AND date <= ? AND date != ? AND status != 'cancelled') AS upcoming_appointments,
        (SELECT COUNT(*) FROM patients) AS total_patients,
        (SELECT COUNT(*) FROM appointments WHERE date >= ? AND date <= ? AND status != 'cancelled') AS this_month_appointments
    `).get(today, today, weekEnd, today, thisMonthStart, today) as {
      today_appointments: number;
      upcoming_appointments: number;
      total_patients: number;
      this_month_appointments: number;
    };

    const unpaidInvoices = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM invoices WHERE paid = 0
    `).get() as { count: number; total: number };

    const revenue = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN created_at >= ? THEN total ELSE 0 END), 0) AS this_month,
        COALESCE(SUM(CASE WHEN created_at >= ? AND created_at < ? THEN total ELSE 0 END), 0) AS last_month
      FROM invoices
      WHERE paid = 1
    `).get(thisMonthStart, lastMonthStart, thisMonthStart) as { this_month: number; last_month: number };

    const sixMonthsRows = db.prepare(`
      SELECT
        strftime('%Y-%m', created_at) AS month,
        COALESCE(SUM(total), 0) AS revenue
      FROM invoices
      WHERE paid = 1
        AND created_at >= date('now', '-5 months', 'start of month')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month ASC
    `).all() as { month: string; revenue: number }[];

    const sixMonthsRevenue: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('de-AT', { month: 'short', year: '2-digit' });
      const found = sixMonthsRows.find(r => r.month === key);
      sixMonthsRevenue.push({ month: label, revenue: found?.revenue || 0 });
    }

    const todayDetails = db.prepare(`
      SELECT a.*, p.first_name || ' ' || p.last_name as patient_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.date = ?
        AND a.status != 'cancelled'
      ORDER BY a.time_start
    `).all(today);

    const upcomingThisWeek = db.prepare(`
      SELECT a.*, p.first_name || ' ' || p.last_name as patient_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.date >= ? AND a.date <= ?
        AND a.status != 'cancelled'
      ORDER BY a.date, a.time_start
    `).all(today > weekStart ? today : weekStart, weekEnd);

    res.json({
      success: true,
      data: {
        today_appointments: stats.today_appointments,
        upcoming_appointments: stats.upcoming_appointments,
        unpaid_invoices: unpaidInvoices.count,
        unpaid_invoices_total: unpaidInvoices.total || 0,
        total_patients: stats.total_patients,
        today_details: todayDetails,
        this_month_appointments: stats.this_month_appointments,
        this_month_revenue: revenue.this_month,
        last_month_revenue: revenue.last_month,
        week_start: weekStart,
        week_end: weekEnd,
        upcoming_this_week: upcomingThisWeek,
        six_months_revenue: sixMonthsRevenue
      }
    });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Laden der Dashboard-Daten:', 'Dashboard-Daten konnten nicht geladen werden.');
  }
});

export default router;
