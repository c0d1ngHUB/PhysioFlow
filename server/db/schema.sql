-- PhysioFlow SQLite Schema

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    birthdate TEXT,
    notes TEXT,
    insurance_number TEXT,
    address TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    time_start TEXT NOT NULL,
    time_end TEXT NOT NULL,
    treatment_type TEXT NOT NULL,
    notes TEXT,
    sms_reminder INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'scheduled',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT NOT NULL UNIQUE,
    patient_id INTEGER NOT NULL,
    appointment_id INTEGER,
    units REAL NOT NULL,
    rate_per_unit REAL NOT NULL,
    total REAL NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    paid INTEGER DEFAULT 0,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
);

-- SMS Log table
CREATE TABLE IF NOT EXISTS sms_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id INTEGER NOT NULL,
    sent_at TEXT DEFAULT (datetime('now')),
    status TEXT NOT NULL,
    message TEXT,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_paid ON invoices(paid);
CREATE INDEX IF NOT EXISTS idx_sms_log_appointment ON sms_log(appointment_id);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    receipt_path TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Index for expenses
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'therapist')),
    created_at TEXT DEFAULT (datetime('now'))
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT (datetime('now')),
    action TEXT NOT NULL,
    username TEXT,
    ip TEXT,
    success INTEGER NOT NULL
);
