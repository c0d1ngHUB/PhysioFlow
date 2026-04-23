import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

// Get all expenses
router.get('/', (req, res) => {
  try {
    const { category, from, to, limit = 100 } = req.query;
    
    let sql = 'SELECT * FROM expenses WHERE 1=1';
    const params: any[] = [];
    
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
    const totalsParams: any[] = [];
    
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
    console.error('Failed to fetch expenses:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch expenses' });
  }
});

// Get categories
router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT DISTINCT category FROM expenses ORDER BY category').all();
    res.json({ success: true, data: categories.map((c: any) => c.category) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

// Create expense
router.post('/', (req, res) => {
  try {
    const { category, description, amount, date, receipt_path } = req.body;
    
    if (!category || !amount || !date) {
      return res.status(400).json({ success: false, error: 'Category, amount and date are required' });
    }
    
    const result = db.prepare(`
      INSERT INTO expenses (category, description, amount, date, receipt_path)
      VALUES (?, ?, ?, ?, ?)
    `).run(category, description || '', amount, date, receipt_path || null);
    
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, data: expense });
  } catch (error) {
    console.error('Failed to create expense:', error);
    res.status(500).json({ success: false, error: 'Failed to create expense' });
  }
});

// Update expense
router.put('/:id', (req, res) => {
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
    res.status(500).json({ success: false, error: 'Failed to update expense' });
  }
});

// Delete expense
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Ausgabe nicht gefunden' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete expense' });
  }
});

export default router;
