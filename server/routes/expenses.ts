import { Router } from 'express';
import db from '../db/index.js';
import { requireRole } from '../utils/auth.js';
import { respondWithServerError } from '../utils/httpErrors.js';
import { expenseSchema, expenseUpdateSchema, validateBody } from '../utils/validation.js';
import { logAudit, getAuditContext, safeJson } from '../utils/auditLog.js';
import { getPaginationParams } from '../utils/pagination.js';
import { getSingleQueryValue } from '../utils/formatting.js';

const router = Router();
type SqlParam = string | number | null;

const ALLOWED_EXPENSE_FIELDS = new Set([
  'category', 'description', 'amount', 'date', 'receipt_path',
]);

// Get all expenses
router.get('/', (req, res) => {
  try {
    const category = getSingleQueryValue(req.query.category);
    const from = getSingleQueryValue(req.query.from);
    const to = getSingleQueryValue(req.query.to);
    const { page, limit } = getPaginationParams(req);
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM expenses WHERE 1=1';
    const params: SqlParam[] = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (from) {
      sql += ' AND date >= ?';
      params.push(from);
    }
    if (to) {
      sql += ' AND date <= ?';
      params.push(to);
    }

    sql += ' ORDER BY date DESC';

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = db.prepare(countSql).get(...params) as { total: number };
    const total = countResult?.total || 0;

    const expenses = db.prepare(sql + ' LIMIT ? OFFSET ?').all(...params, limit, offset);

    let totalsSql = `
      SELECT
        COALESCE(SUM(amount), 0) as total,
        COALESCE(SUM(CASE WHEN strftime('%Y-%m', date) = strftime('%Y-%m', 'now') THEN amount ELSE 0 END), 0) as month_total
      FROM expenses WHERE 1=1
    `;
    const totalsParams: SqlParam[] = [];

    if (category) {
      totalsSql += ' AND category = ?';
      totalsParams.push(category);
    }
    if (from) {
      totalsSql += ' AND date >= ?';
      totalsParams.push(from);
    }
    if (to) {
      totalsSql += ' AND date <= ?';
      totalsParams.push(to);
    }

    const totals = db.prepare(totalsSql).get(...totalsParams) as { total: number; month_total: number };

    res.json({
      success: true,
      data: expenses,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      totals: {
        all: totals.total,
        thisMonth: totals.month_total
      }
    });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Laden der Ausgaben:', 'Ausgaben konnten nicht geladen werden.');
  }
});

// Get categories
router.get('/categories', (_req, res) => {
  try {
    interface ExpenseCategoryRow { category: string; }
    const categories = db.prepare('SELECT DISTINCT category FROM expenses ORDER BY category').all() as ExpenseCategoryRow[];
    res.json({ success: true, data: categories.map((category) => category.category) });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Laden der Ausgabenkategorien:', 'Ausgabenkategorien konnten nicht geladen werden.');
  }
});

// Create expense
router.post('/', requireRole('admin'), validateBody(expenseSchema), (req, res) => {
  try {
    const { category, description, amount, date, receipt_path } = req.body;

    const result = db.prepare(`
      INSERT INTO expenses (category, description, amount, date, receipt_path)
      VALUES (?, ?, ?, ?, ?)
    `).run(category, description || '', amount, date, receipt_path || null);

    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);
    const ctx = getAuditContext(req);
    logAudit({ ...ctx, action: 'create', entity_type: 'expense', entity_id: result.lastInsertRowid, new_value: safeJson(expense), success: true });

    res.json({ success: true, data: expense });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Erstellen der Ausgabe:', 'Ausgabe konnte nicht angelegt werden.');
  }
});

// Update expense
router.put('/:id', requireRole('admin'), validateBody(expenseUpdateSchema), (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body as Record<string, unknown>;

    const old = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    if (!old) {
      return res.status(404).json({ success: false, error: 'Ausgabe nicht gefunden' });
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    for (const key of Object.keys(body)) {
      if (!ALLOWED_EXPENSE_FIELDS.has(key)) continue;
      updates.push(`${key} = ?`);
      values.push(body[key]);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'Keine Felder zum Aktualisieren angegeben' });
    }

    values.push(id);
    const result = db.prepare(`
      UPDATE expenses
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Ausgabe nicht gefunden' });
    }

    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    const ctx = getAuditContext(req);
    logAudit({ ...ctx, action: 'update', entity_type: 'expense', entity_id: id, old_value: safeJson(old), new_value: safeJson(expense), success: true });

    res.json({ success: true, data: expense });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Aktualisieren der Ausgabe:', 'Ausgabe konnte nicht aktualisiert werden.');
  }
});

// Delete expense
router.delete('/:id', requireRole('admin'), (req, res) => {
  try {
    const { id } = req.params;
    const old = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    const result = db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Ausgabe nicht gefunden' });
    }

    const ctx = getAuditContext(req);
    logAudit({ ...ctx, action: 'delete', entity_type: 'expense', entity_id: id, old_value: safeJson(old), success: true });

    res.json({ success: true });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Löschen der Ausgabe:', 'Ausgabe konnte nicht gelöscht werden.');
  }
});

export default router;
