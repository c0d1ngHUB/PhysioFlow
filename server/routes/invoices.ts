import { Router } from 'express';
import db from '../db/index.js';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { requireRole } from '../utils/auth.js';
import { respondWithServerError } from '../utils/httpErrors.js';
import { formatCurrency } from '../utils/formatting.js';
import { logAudit, getAuditContext, safeJson } from '../utils/auditLog.js';
import { getPaginationParams, paginatedResponse } from '../utils/pagination.js';

const router = Router();
type SqlParam = string | number | null;

function getSingleQueryValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

const DUNNING_LABELS: Record<number, string> = {
  0: 'Keine Mahnung',
  1: 'Zahlungserinnerung',
  2: 'Mahnung',
  3: 'Letzte Mahnung',
};

function calculateDunningDeadline(level: number): string {
  const date = new Date();
  const days = level >= 3 ? 5 : level === 2 ? 7 : 10;
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function generateInvoiceNumber(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;

  const todayInvoices = db.prepare(`
    SELECT COUNT(*) as count FROM invoices
    WHERE invoice_number LIKE ?
  `).get(`RF-${dateStr}%`) as { count: number };

  const sequence = String(todayInvoices.count + 1).padStart(3, '0');
  return `RF-${dateStr}-${sequence}`;
}

// Get all invoices
router.get('/', (req, res) => {
  const paid = getSingleQueryValue(req.query.paid);
  const patientId = getSingleQueryValue(req.query.patient_id);

  let query = `
    SELECT i.*, p.first_name || ' ' || p.last_name as patient_name,
           p.email as patient_email, p.phone as patient_phone
    FROM invoices i
    JOIN patients p ON i.patient_id = p.id
    WHERE 1=1
  `;
  const params: SqlParam[] = [];

  if (paid !== undefined) {
    query += ' AND i.paid = ?';
    params.push(paid === 'true' ? 1 : 0);
  }

  if (patientId) {
    query += ' AND i.patient_id = ?';
    params.push(patientId);
  }

  query += ' ORDER BY i.created_at DESC';

  try {
    const { page, limit } = getPaginationParams(req);
    const offset = (page - 1) * limit;

    const countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM').replace(/ORDER BY.*$/, '');
    const countResult = db.prepare(countQuery).get(...params) as { total: number };
    const total = countResult?.total || 0;

    const paginatedQuery = query + ' LIMIT ? OFFSET ?';
    const invoices = db.prepare(paginatedQuery).all(...params, limit, offset);

    res.json(paginatedResponse(invoices, total, page, limit));
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Laden der Honorarnoten:', 'Honorarnoten konnten nicht geladen werden.');
  }
});

// Get single invoice
router.get('/:id', (req, res) => {
  try {
    const invoice = db.prepare(`
      SELECT i.*, p.first_name || ' ' || p.last_name as patient_name,
             p.email as patient_email, p.phone as patient_phone,
             p.birthdate as patient_birthdate
      FROM invoices i
      JOIN patients p ON i.patient_id = p.id
      WHERE i.id = ?
    `).get(req.params.id);

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Honorarnote nicht gefunden' });
    }
    res.json({ success: true, data: invoice });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Laden der Honorarnote:', 'Honorarnote konnte nicht geladen werden.');
  }
});

// Create invoice
router.post('/', requireRole('admin'), async (req, res) => {
  const { patient_id, appointment_id, units, rate_per_unit, description } = req.body;

  if (!patient_id || !units || !rate_per_unit) {
    return res.status(400).json({
      success: false,
      error: 'Patient, Einheiten und Satz sind erforderlich'
    });
  }

  if (units <= 0 || rate_per_unit <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Einheiten und Satz müssen positive Zahlen sein'
    });
  }

  const total = units * rate_per_unit;

  try {
    const createInvoice = db.transaction(() => {
      const invoice_number = generateInvoiceNumber();
      const info = db.prepare(`
        INSERT INTO invoices (invoice_number, patient_id, appointment_id, units, rate_per_unit, total, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(invoice_number, patient_id, appointment_id || null, units, rate_per_unit, total, description || '');
      return info.lastInsertRowid;
    });

    const lastId = createInvoice();

    const invoice = db.prepare(`
      SELECT i.*, p.first_name || ' ' || p.last_name as patient_name,
             p.email as patient_email, p.phone as patient_phone,
             p.birthdate as patient_birthdate
      FROM invoices i
      JOIN patients p ON i.patient_id = p.id
      WHERE i.id = ?
    `).get(lastId);

    const ctx = getAuditContext(req);
    logAudit({ ...ctx, action: 'create', entity_type: 'invoice', entity_id: lastId, new_value: safeJson(invoice), success: true });

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Erstellen der Honorarnote:', 'Honorarnote konnte nicht angelegt werden.');
  }
});

// Generate PDF for invoice
router.get('/:id/pdf', async (req, res) => {
  try {
    const invoice = db.prepare(`
      SELECT i.*, p.first_name || ' ' || p.last_name as patient_name,
             p.email as patient_email, p.phone as patient_phone,
             p.birthdate as patient_birthdate, p.notes as patient_notes
      FROM invoices i
      JOIN patients p ON i.patient_id = p.id
      WHERE i.id = ?
    `).get(req.params.id) as {
      invoice_number: string;
      created_at: string;
      patient_name: string;
      patient_birthdate?: string | null;
      patient_email?: string | null;
      patient_phone?: string | null;
      description?: string | null;
      units: number;
      rate_per_unit: number;
      total: number;
    } | undefined;

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Honorarnote nicht gefunden' });
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
    doc.pipe(res);

    doc.fontSize(24).font('Helvetica-Bold').text('HONORARNOTE', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).font('Helvetica');
    doc.text(`Rechnungsnummer: ${invoice.invoice_number}`);
    doc.text(`Datum: ${new Date(invoice.created_at).toLocaleDateString('de-AT')}`);
    doc.moveDown();

    doc.font('Helvetica-Bold').text('Patient/Patientin:');
    doc.font('Helvetica').text(`${invoice.patient_name}`);
    if (invoice.patient_birthdate) {
      doc.text(`Geburtsdatum: ${new Date(invoice.patient_birthdate).toLocaleDateString('de-AT')}`);
    }
    if (invoice.patient_email) {
      doc.text(`E-Mail: ${invoice.patient_email}`);
    }
    if (invoice.patient_phone) {
      doc.text(`Telefon: ${invoice.patient_phone}`);
    }
    doc.moveDown();

    doc.font('Helvetica-Bold').text('Leistungen:');
    doc.moveDown(0.5);

    const tableTop = doc.y;
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Beschreibung', 50, tableTop);
    doc.text('Einheiten', 300, tableTop, { width: 80, align: 'right' });
    doc.text('€/Einheit', 380, tableTop, { width: 80, align: 'right' });
    doc.text('Gesamt', 460, tableTop, { width: 80, align: 'right' });

    doc.moveTo(50, tableTop + 15).lineTo(540, tableTop + 15).stroke();

    doc.font('Helvetica').fontSize(10);
    const rowY = tableTop + 25;
    doc.text(invoice.description || 'Physiotherapeutische Leistung', 50, rowY);
    doc.text(invoice.units.toString(), 300, rowY, { width: 80, align: 'right' });
    doc.text(invoice.rate_per_unit.toFixed(2), 380, rowY, { width: 80, align: 'right' });
    doc.text(invoice.total.toFixed(2) + ' €', 460, rowY, { width: 80, align: 'right' });

    doc.moveDown(3);

    doc.moveTo(300, doc.y).lineTo(540, doc.y).stroke();
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('Gesamtbetrag:', 300, doc.y);
    doc.text(invoice.total.toFixed(2) + ' €', 460, doc.y, { width: 80, align: 'right' });

    doc.moveDown(2);
    doc.font('Helvetica').fontSize(9);
    doc.text('Steuerbefreit gemäß §6 Abs.1 Z 19 UStG (Heilbehandlungsleistungen)', { align: 'center' });

    doc.moveDown(2);
    const qrData = `RKS1.0|${invoice.invoice_number}|${invoice.total.toFixed(2)}|EUR|${new Date(invoice.created_at).toISOString().slice(0,10)}`;
    try {
      const qrDataUrl = await QRCode.toDataURL(qrData, { width: 100, margin: 1 });
      const qrImage = Buffer.from(qrDataUrl.split(',')[1], 'base64');
      doc.image(qrImage, 50, doc.y, { width: 80 });
      doc.fontSize(7).text('QR-Code für Registrierkasse', 50, doc.y + 85);
    } catch (qrError) {
      console.error('QR generation failed:', qrError);
    }

    doc.moveDown(4);
    doc.fontSize(8).text('PhysioFlow - Erstellt mit PhysioFlow Software', { align: 'center' });

    doc.end();

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ success: false, error: 'PDF konnte nicht erstellt werden' });
  }
});

router.post('/:id/dunning/escalate', requireRole('admin'), (req, res) => {
  try {
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id) as {
      id: number;
      paid: number;
      dunning_level: number;
    } | undefined;

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Honorarnote nicht gefunden' });
    }

    if (invoice.paid) {
      return res.status(400).json({ success: false, error: 'Bezahlte Honorarnoten können nicht gemahnt werden' });
    }

    if (invoice.dunning_level >= 3) {
      return res.status(400).json({ success: false, error: 'Die letzte Mahnstufe ist bereits erreicht' });
    }

    const nextLevel = invoice.dunning_level + 1;
    const dunningDate = new Date().toISOString();

    db.prepare(`
      UPDATE invoices
      SET dunning_level = ?, dunning_date = ?
      WHERE id = ?
    `).run(nextLevel, dunningDate, req.params.id);

    const updated = db.prepare(`
      SELECT i.*, p.first_name || ' ' || p.last_name as patient_name,
             p.email as patient_email, p.phone as patient_phone
      FROM invoices i
      JOIN patients p ON i.patient_id = p.id
      WHERE i.id = ?
    `).get(req.params.id);

    const ctx = getAuditContext(req);
    logAudit({ ...ctx, action: 'dunning_escalate', entity_type: 'invoice', entity_id: req.params.id, new_value: safeJson({ dunning_level: nextLevel }), success: true });

    res.json({ success: true, data: updated });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Mahnstufen-Update:', 'Mahnstufe konnte nicht aktualisiert werden.');
  }
});

router.get('/:id/dunning-letter.pdf', (req, res) => {
  try {
    const invoice = db.prepare(`
      SELECT i.*, p.first_name || ' ' || p.last_name as patient_name,
             p.email as patient_email, p.phone as patient_phone,
             p.address as patient_address
      FROM invoices i
      JOIN patients p ON i.patient_id = p.id
      WHERE i.id = ?
    `).get(req.params.id) as {
      invoice_number: string;
      total: number;
      dunning_level: number;
      patient_name: string;
      patient_email?: string | null;
      patient_phone?: string | null;
      patient_address?: string | null;
    } | undefined;

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Honorarnote nicht gefunden' });
    }

    if (invoice.dunning_level <= 0) {
      return res.status(400).json({ success: false, error: 'Für diese Honorarnote wurde noch keine Mahnstufe gesetzt' });
    }

    const deadline = calculateDunningDeadline(invoice.dunning_level);
    const levelLabel = DUNNING_LABELS[invoice.dunning_level] ?? 'Mahnung';

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}-${invoice.dunning_level}-mahnung.pdf"`);
    doc.pipe(res);

    doc.fontSize(20).font('Helvetica-Bold').text(levelLabel);
    doc.moveDown();
    doc.fontSize(11).font('Helvetica');
    doc.text(`Bezug auf Honorarnote: ${invoice.invoice_number}`);
    doc.text(`Datum: ${new Date().toLocaleDateString('de-AT')}`);
    doc.text(`Zahlungsfrist: ${new Date(deadline).toLocaleDateString('de-AT')}`);
    doc.moveDown();

    doc.font('Helvetica-Bold').text('Patient/in');
    doc.font('Helvetica').text(invoice.patient_name);
    if (invoice.patient_address) {
      doc.text(invoice.patient_address);
    }
    if (invoice.patient_email) {
      doc.text(invoice.patient_email);
    }
    if (invoice.patient_phone) {
      doc.text(invoice.patient_phone);
    }

    doc.moveDown(2);
    doc.font('Helvetica').text(
      `Wir ersuchen um Begleichung des offenen Betrags aus der Honorarnote ${invoice.invoice_number}. ` +
      `Der derzeit offene Gesamtbetrag beträgt ${formatCurrency(invoice.total)}. ` +
      `Bitte überweisen Sie den Betrag bis spätestens ${new Date(deadline).toLocaleDateString('de-AT')}.`
    );

    if (invoice.dunning_level >= 2) {
      doc.moveDown();
      doc.text('Sollte bereits eine Zahlung erfolgt sein, betrachten Sie dieses Schreiben bitte als gegenstandslos.');
    }

    if (invoice.dunning_level >= 3) {
      doc.moveDown();
      doc.font('Helvetica-Bold').text('Hinweis');
      doc.font('Helvetica').text('Dies ist die letzte Mahnung vor weiteren rechtlichen Schritten.');
    }

    doc.moveDown(2);
    doc.font('Helvetica-Bold').text('Betrag');
    doc.font('Helvetica').text(formatCurrency(invoice.total));

    doc.moveDown(3);
    doc.fontSize(9).text('Steuerbefreit gemäß §6 Abs.1 Z 19 UStG (Heilbehandlungsleistungen)', { align: 'center' });
    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, error: 'Mahnbrief konnte nicht erstellt werden' });
  }
});

// Mark invoice as paid/unpaid
router.put('/:id/paid', requireRole('admin'), (req, res) => {
  const { paid } = req.body;

  try {
    const old = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    const result = db.prepare(`
      UPDATE invoices
      SET paid = ?, dunning_level = CASE WHEN ? = 1 THEN 0 ELSE dunning_level END,
          dunning_date = CASE WHEN ? = 1 THEN NULL ELSE dunning_date END
      WHERE id = ?
    `).run(paid ? 1 : 0, paid ? 1 : 0, paid ? 1 : 0, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Honorarnote nicht gefunden' });
    }

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    const ctx = getAuditContext(req);
    logAudit({ ...ctx, action: paid ? 'mark_paid' : 'mark_unpaid', entity_type: 'invoice', entity_id: req.params.id, old_value: safeJson(old), new_value: safeJson(invoice), success: true });

    res.json({ success: true, data: invoice });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Aktualisieren des Zahlungsstatus:', 'Zahlungsstatus konnte nicht aktualisiert werden.');
  }
});

// Delete invoice
router.delete('/:id', requireRole('admin'), (req, res) => {
  try {
    const old = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    const result = db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Honorarnote nicht gefunden' });
    }

    const ctx = getAuditContext(req);
    logAudit({ ...ctx, action: 'delete', entity_type: 'invoice', entity_id: req.params.id, old_value: safeJson(old), success: true });

    res.json({ success: true, message: 'Honorarnote erfolgreich gelöscht' });
  } catch (error) {
    respondWithServerError(res, error, 'Fehler beim Löschen der Honorarnote:', 'Honorarnote konnte nicht gelöscht werden.');
  }
});

export default router;
