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
    
    // Calculate totals
    const totals = db.prepare(`
      SELECT 
        COALESCE(SUM(amount), 0) as total,
        COALESCE SUM(CASE WHEN strftime('%Y-%m', date) = strftime('%Y-%m', 'now') THEN amount ELSE 0 END) as month_total
      FROM expenses
    `).get() as { total: number; month_total: number };
    
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
    const { category, description, amount, date, receipt_path } = req.body;
    
    db.prepare(`
      UPDATE expenses 
      SET category = COALESCE(?, category),
          description = COALESCE(?, description),
          amount = COALESCE(?, amount),
          date = COALESCE(?, date),
          receipt_path = COALESCE(?, receipt_path)
      WHERE id = ?
    `).run(category, description, amount, date, receipt_path, id);
    
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
    db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete expense' });
  }
});

export default router;
