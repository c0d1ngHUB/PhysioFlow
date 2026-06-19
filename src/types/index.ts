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
  is_archived?: boolean;
  archived_at?: string | null;
  created_at?: string;
}

// Appointment Type
export interface Appointment {
  id?: number;
  patient_id: number;
  date: string;
  time_start: string;
  time_end: string;
  treatment_type: string;
  notes?: string;
  treatment_notes?: string;
  treatment_services?: string | string[];
  next_appointment_date?: string;
  treatment_completed_at?: string;
  status?: 'confirmed' | 'cancelled';
  sms_reminder: 0 | 1 | 2 | 3; // 0=kein SMS, 1=gesendet, 2=geplant, 3=fehlgeschlagen
  created_at?: string;
  // Joined fields (always present from API)
  patient_name: string;
  patient_phone: string;
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
