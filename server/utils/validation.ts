import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

export const patientSchema = z.object({
  first_name: z.string().min(1, 'Vorname ist erforderlich'),
  last_name: z.string().min(1, 'Nachname ist erforderlich'),
  phone: z.string().nullable().optional(),
  email: z.string().email('Ungültige E-Mail').nullable().optional(),
  birthdate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  insurance_number: z.string().nullable().optional(),
});

export const appointmentSchema = z.object({
  patient_id: z.coerce.number().int().positive('Patient ist erforderlich'),
  therapist_id: z.coerce.number().int().positive().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum muss YYYY-MM-DD sein'),
  time_start: z.string().regex(/^\d{2}:\d{2}$/, 'Startzeit muss HH:MM sein'),
  time_end: z.string().regex(/^\d{2}:\d{2}$/, 'Endzeit muss HH:MM sein'),
  treatment_type: z.string().min(1, 'Behandlungstyp ist erforderlich'),
  notes: z.string().nullable().optional(),
  sms_reminder: z.union([z.boolean(), z.coerce.number()]).nullable().optional(),
});

export const voucherSchema = z.object({
  code: z.string().min(1, 'Code ist erforderlich'),
  patient_id: z.coerce.number().int().positive().nullable().optional(),
  description: z.string().min(1, 'Beschreibung ist erforderlich'),
  value: z.coerce.number().positive('Wert muss positiv sein'),
  expires_at: z.string().nullable().optional(),
});

export const expenseSchema = z.object({
  category: z.string().min(1, 'Kategorie ist erforderlich'),
  description: z.string().nullable().optional(),
  amount: z.coerce.number().positive('Betrag muss positiv sein'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum muss YYYY-MM-DD sein'),
  receipt_path: z.string().nullable().optional(),
});

export const patientUpdateSchema = patientSchema.partial();
export const appointmentUpdateSchema = appointmentSchema.partial();
export const voucherUpdateSchema = voucherSchema.partial();
export const expenseUpdateSchema = expenseSchema.partial();

export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = (result.error as z.ZodError).issues;
      const errors = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ success: false, error: `Validierungsfehler: ${errors}` });
      return;
    }
    req.body = result.data;
    next();
  };
}
