import { Router } from 'express';
import db from '../db/index.js';
import { requireRole } from '../utils/auth.js';
import { respondWithServerError } from '../utils/httpErrors.js';

const router = Router();
type SqlParam = string | number | null;

interface ExpenseCategoryRow {
  category: string;
}

function getSingleQueryValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

// Get all expenses
router.get('/', (req, res) => {
  try {
    const category = getSingleQueryValue(req.query.category);
    const from = getSingleQueryValue(req.query.from);
    const to = getSingleQueryValue(req.query.to);
    const limit = getSingleQueryValue(req.query.limit) ?? '100';
    
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
    
    sql += ' ORDER BY date DESC LIMIT ?';
    params.push(Number(limit));
    
    const expenses = db.prepare(sql).all(...params);
    
    // Calculate totals (apply same filters to totals query)
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
    const categories = db.prepare('SELECT DISTINCT category FROM expenses ORDER BY category').all() as ExpenseCategoryRow[];
    res.json({ success: true, data: categories.map((category) => category.category) });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Laden der Ausgabenkategorien:', 'Ausgabenkategorien konnten nicht geladen werden.');
  }
});

// Create expense
router.post('/', requireRole('admin'), (req, res) => {
  try {
    const { category, description, amount, date, receipt_path } = req.body;
    
    if (!category || !amount || !date) {
      return res.status(400).json({ success: false, error: 'Kategorie, Betrag und Datum sind erforderlich.' });
    }
    
    const result = db.prepare(`
      INSERT INTO expenses (category, description, amount, date, receipt_path)
      VALUES (?, ?, ?, ?, ?)
    `).run(category, description || '', amount, date, receipt_path || null);
    
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, data: expense });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Erstellen der Ausgabe:', 'Ausgabe konnte nicht angelegt werden.');
  }
});

// Update expense
router.put('/:id', requireRole('admin'), (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    
    // Only update fields that are explicitly provided in the request body
    const updates: string[] = [];
    const values: unknown[] = [];
    
    if ('category' in body) { updates.push('category = ?'); values.push(body.category); }
    if ('description' in body) { updates.push('description = ?'); values.push(body.description); }
    if ('amount' in body) { updates.push('amount = ?'); values.push(body.amount); }
    if ('date' in body) { updates.push('date = ?'); values.push(body.date); }
    if ('receipt_path' in body) { updates.push('receipt_path = ?'); values.push(body.receipt_path); }
    
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
    res.json({ success: true, data: expense });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Aktualisieren der Ausgabe:', 'Ausgabe konnte nicht aktualisiert werden.');
  }
});

// Delete expense
router.delete('/:id', requireRole('admin'), (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Ausgabe nicht gefunden' });
    }
    res.json({ success: true });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Löschen der Ausgabe:', 'Ausgabe konnte nicht gelöscht werden.');
  }
});

export default router;
