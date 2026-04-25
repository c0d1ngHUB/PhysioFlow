import { Router } from 'express';
import db from '../db/index.js';
import { respondWithServerError } from '../utils/httpErrors.js';

const router = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (req.session.user?.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Keine Berechtigung' });
    return;
  }
  next();
}

router.get('/', (_req, res) => {
  try {
    const therapists = db.prepare('SELECT * FROM therapists ORDER BY name ASC').all();
    res.json({ success: true, data: therapists });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Laden der Therapeut:innen:', 'Therapeut:innen konnten nicht geladen werden.');
  }
});

router.post('/', requireAdmin, (req, res) => {
  const { name, color } = req.body ?? {};

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ success: false, error: 'Name ist erforderlich' });
  }

  const safeColor = typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#2563EB';

  try {
    const result = db.prepare(`
      INSERT INTO therapists (name, color)
      VALUES (?, ?)
    `).run(name.trim(), safeColor);

    const therapist = db.prepare('SELECT * FROM therapists WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: therapist });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Erstellen der Therapeutin bzw. des Therapeuten:', 'Therapeut/in konnte nicht angelegt werden.');
  }
});

router.put('/:id', requireAdmin, (req, res) => {
  const { name, color } = req.body ?? {};
  const safeColor = typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#2563EB';

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ success: false, error: 'Name ist erforderlich' });
  }

  try {
    const result = db.prepare(`
      UPDATE therapists
      SET name = ?, color = ?
      WHERE id = ?
    `).run(name.trim(), safeColor, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Therapeut/in nicht gefunden' });
    }

    const therapist = db.prepare('SELECT * FROM therapists WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: therapist });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Aktualisieren der Therapeutin bzw. des Therapeuten:', 'Therapeut/in konnte nicht aktualisiert werden.');
  }
});

router.delete('/:id', requireAdmin, (req, res) => {
  try {
    const therapistCount = db.prepare('SELECT COUNT(*) as count FROM therapists').get() as { count: number };
    if (therapistCount.count <= 1) {
      return res.status(400).json({ success: false, error: 'Mindestens ein/e Therapeut/in muss bestehen bleiben' });
    }

    const result = db.prepare('DELETE FROM therapists WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Therapeut/in nicht gefunden' });
    }

    res.json({ success: true, message: 'Therapeut/in gelöscht' });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Löschen der Therapeutin bzw. des Therapeuten:', 'Therapeut/in konnte nicht gelöscht werden.');
  }
});

export default router;
