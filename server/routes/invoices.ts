import { Router } from 'express';
import db from '../db/index.js';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

const router = Router();

// Generate next invoice number: RF-YYYYMMDD-XXX
// Must be called within a BEGIN IMMEDIATE transaction to prevent race conditions
function generateInvoiceNumber(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;
  
  // Get count of invoices today
  const todayInvoices = db.prepare(`
    SELECT COUNT(*) as count FROM invoices 
    WHERE invoice_number LIKE ?
  `).get(`RF-${dateStr}%`) as { count: number };
  
  const sequence = String(todayInvoices.count + 1).padStart(3, '0');
  return `RF-${dateStr}-${sequence}`;
}

// Get all invoices
router.get('/', (req, res) => {
  const { paid, patient_id } = req.query;
  
  let query = `
    SELECT i.*, p.first_name || ' ' || p.last_name as patient_name,
           p.email as patient_email, p.phone as patient_phone
    FROM invoices i
    JOIN patients p ON i.patient_id = p.id
    WHERE 1=1
  `;
  const params: any[] = [];
  
  if (paid !== undefined) {
    query += ' AND i.paid = ?';
    params.push(paid === 'true' ? 1 : 0);
  }
  
  if (patient_id) {
    query += ' AND i.patient_id = ?';
    params.push(patient_id);
  }
  
  query += ' ORDER BY i.created_at DESC';
  
  try {
    const invoices = db.prepare(query).all(...params);
    res.json({ success: true, data: invoices });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
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
      return res.status(404).json({ success: false, error: 'Honorar note nicht gefunden' });
    }
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Create invoice
router.post('/', async (req, res) => {
  const { patient_id, appointment_id, units, rate_per_unit, description } = req.body;
  
  if (!patient_id || !units || !rate_per_unit) {
    return res.status(400).json({ 
      success: false, 
      error: 'Patient, Einheiten und Satz sind erforderlich' 
    });
  }
  
  // Validate positive numbers
  if (units <= 0 || rate_per_unit <= 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'Einheiten und Satz müssen positive Zahlen sein' 
    });
  }
  
  const total = units * rate_per_unit;
  
  try {
    // Wrap number generation + INSERT in a transaction to prevent race conditions
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
    
    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
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
    `).get(req.params.id) as any;
    
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Honorar note nicht gefunden' });
    }
    
    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
    doc.pipe(res);
    
    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('HONORARNOTE', { align: 'center' });
    doc.moveDown();
    
    // Invoice details
    doc.fontSize(12).font('Helvetica');
    doc.text(`Rechnungsnummer: ${invoice.invoice_number}`);
    doc.text(`Datum: ${new Date(invoice.created_at).toLocaleDateString('de-AT')}`);
    doc.moveDown();
    
    // Patient details
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
    
    // Invoice items table
    doc.font('Helvetica-Bold').text('Leistungen:');
    doc.moveDown(0.5);
    
    // Table header
    const tableTop = doc.y;
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Beschreibung', 50, tableTop);
    doc.text('Einheiten', 300, tableTop, { width: 80, align: 'right' });
    doc.text('€/Einheit', 380, tableTop, { width: 80, align: 'right' });
    doc.text('Gesamt', 460, tableTop, { width: 80, align: 'right' });
    
    doc.moveTo(50, tableTop + 15).lineTo(540, tableTop + 15).stroke();
    
    // Table row
    doc.font('Helvetica').fontSize(10);
    const rowY = tableTop + 25;
    doc.text(invoice.description || 'Physiotherapeutische Leistung', 50, rowY);
    doc.text(invoice.units.toString(), 300, rowY, { width: 80, align: 'right' });
    doc.text(invoice.rate_per_unit.toFixed(2), 380, rowY, { width: 80, align: 'right' });
    doc.text(invoice.total.toFixed(2) + ' €', 460, rowY, { width: 80, align: 'right' });
    
    doc.moveDown(3);
    
    // Total
    doc.moveTo(300, doc.y).lineTo(540, doc.y).stroke();
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('Gesamtbetrag:', 300, doc.y);
    doc.text(invoice.total.toFixed(2) + ' €', 460, doc.y, { width: 80, align: 'right' });
    
    // MwSt-Hinweis (befreit nach §6 Abs.1 Z 19 UStG)
    doc.moveDown(2);
    doc.font('Helvetica').fontSize(9);
    doc.text('Steuerbefreit gemäß §6 Abs.1 Z 19 UStG (Heilbehandlungsleistungen)', { align: 'center' });
    
    // QR Code for Austrian Register (RKS)
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
    
    // Footer
    doc.moveDown(4);
    doc.fontSize(8).text('PhysioFlow - Erstellt mit PhysioFlow Software', { align: 'center' });
    
    doc.end();
    
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ success: false, error: 'PDF konnte nicht erstellt werden' });
  }
});

// Mark invoice as paid/unpaid
router.put('/:id/paid', (req, res) => {
  const { paid } = req.body;
  
  try {
    const result = db.prepare('UPDATE invoices SET paid = ? WHERE id = ?')
      .run(paid ? 1 : 0, req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Honorar note nicht gefunden' });
    }
    
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Delete invoice
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Honorar note nicht gefunden' });
    }
    res.json({ success: true, message: 'Honorar note erfolgreich gelöscht' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
