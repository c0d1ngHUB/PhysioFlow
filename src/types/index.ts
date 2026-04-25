// Patient Type
export interface Patient {
  id?: number;
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  birthdate?: string;
  notes?: string;
  insurance_number?: string;
  address?: string;
  created_at?: string;
}

// Appointment Type
export interface Appointment {
  id?: number;
  patient_id: number;
  therapist_id?: number | null;
  date: string;
  time_start: string;
  time_end: string;
  treatment_type: string;
  notes?: string;
  sms_reminder: 0 | 1 | 2 | 3; // 0=kein SMS, 1=gesendet, 2=geplant, 3=fehlgeschlagen
  status?: 'scheduled' | 'cancelled';
  created_at?: string;
  // Joined fields (always present from API)
  patient_name: string;
  patient_phone: string;
  therapist_name?: string | null;
  therapist_color?: string | null;
}

// Invoice Type
export interface Invoice {
  id?: number;
  invoice_number: string;
  patient_id: number;
  appointment_id?: number;
  units: number;
  rate_per_unit: number;
  total: number;
  description: string;
  created_at?: string;
  paid: boolean; // stored as 0/1 in DB, boolean in API
  dunning_level: 0 | 1 | 2 | 3;
  dunning_date?: string | null;
  // Joined fields
  patient_name: string;
  patient_email?: string;
  patient_phone?: string;
  patient_birthdate?: string;
}

// SMS Message Type
export interface SMSMessage {
  to: string;
  patient_name: string;
  appointment_date: string;
  appointment_time: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Dashboard Stats
export interface DashboardStats {
  today_appointments: number;
  upcoming_appointments: number;
  unpaid_invoices: number;
  total_patients: number;
  unpaid_invoices_total: number;
  week_start?: string;
  week_end?: string;
  today_details: Appointment[];
}

// Expense Type
export interface Expense {
  id?: number;
  category: string;
  description?: string;
  amount: number;
  date: string;
  receipt_path?: string;
  created_at?: string;
}

export interface Therapist {
  id?: number;
  name: string;
  color: string;
  created_at?: string;
}

export interface Voucher {
  id?: number;
  code: string;
  patient_id?: number | null;
  description: string;
  value: number;
  used: boolean;
  used_date?: string | null;
  expires_at?: string | null;
  created_at?: string;
  patient_name?: string | null;
}
