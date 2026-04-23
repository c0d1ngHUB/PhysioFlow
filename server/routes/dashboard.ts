import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

/**
 * Get today's date string in YYYY-MM-DD without timezone pitfalls.
 * Uses UTC to avoid DST shifts that new Date().toISOString() can cause.
 */
function todayStr(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Format a Date as YYYY-MM-DD using local components (no timezone shift).
 */
function toLocalDateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Get dashboard statistics
router.get('/', (_req, res) => {
  try {
    const today = todayStr();
    
    // Calculate date range for "this month"
    const thisMonthStart = today.slice(0, 7) + '-01';
    
    // Calculate last month range
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStart = toLocalDateStr(lastMonth);
    const thisMonthStartAsDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthEnd = toLocalDateStr(new Date(thisMonthStartAsDate.getTime() - 86400000));

    // Week range (Monday to Sunday)
    const weekStart = new Date(now);
    const dayOfWeek = weekStart.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    weekStart.setDate(weekStart.getDate() + mondayOffset);
    const weekStartStr = toLocalDateStr(weekStart);
    const weekFromNow = new Date(now);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const weekFromNowStr = toLocalDateStr(weekFromNow);

    // --- Query 1: Aggregate counts in a single query ---
    const stats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM appointments WHERE date = ?) AS today_appointments,
        (SELECT COUNT(*) FROM appointments WHERE date >= ? AND date <= ? AND date != ?) AS upcoming_appointments,
        (SELECT COUNT(*) FROM patients) AS total_patients,
        (SELECT COUNT(*) FROM appointments WHERE date >= ? AND date <= ?) AS this_month_appointments
    `).get(today, today, weekFromNowStr, today, thisMonthStart, today) as {
      today_appointments: number;
      upcoming_appointments: number;
      total_patients: number;
      this_month_appointments: number;
    };

    // --- Query 2: Unpaid invoices (count + total) ---
    const unpaidInvoices = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM invoices WHERE paid = 0
    `).get() as { count: number; total: number };

    // --- Query 3: Revenue this month + last month in one query ---
    const revenue = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN created_at >= ? THEN total ELSE 0 END), 0) AS this_month,
        COALESCE(SUM(CASE WHEN created_at >= ? AND created_at < ? THEN total ELSE 0 END), 0) AS last_month
      FROM invoices
      WHERE paid = 1
    `).get(thisMonthStart, lastMonthStart, thisMonthStart) as { this_month: number; last_month: number };

    // --- Query 4: 6-month revenue in a single query using GROUP BY ---
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

    // Build full 6-month array (fill missing months with 0)
    const sixMonthsRevenue: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('de-AT', { month: 'short', year: '2-digit' });
      const found = sixMonthsRows.find(r => r.month === key);
      sixMonthsRevenue.push({ month: label, revenue: found?.revenue || 0 });
    }

    // --- Query 5: Today's appointment details ---
    const todayDetails = db.prepare(`
      SELECT a.*, p.first_name || ' ' || p.last_name as patient_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.date = ?
      ORDER BY a.time_start
    `).all(today);

    // --- Query 6: Upcoming this week ---
    const upcomingThisWeek = db.prepare(`
      SELECT a.*, p.first_name || ' ' || p.last_name as patient_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.date >= ? AND a.date <= ?
      ORDER BY a.date, a.time_start
    `).all(weekStartStr, weekFromNowStr);

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
        upcoming_this_week: upcomingThisWeek,
        six_months_revenue: sixMonthsRevenue
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;