import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get directory of current file
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'physioflow.db');

// Create database connection
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schema);

// Migrations: add columns if missing (safe for existing DBs)
const columns = db.prepare("PRAGMA table_info(appointments)").all() as { name: string }[];
if (!columns.some(col => col.name === 'status')) {
  db.exec("ALTER TABLE appointments ADD COLUMN status TEXT NOT NULL DEFAULT 'scheduled'");
  console.log('✅ Migration: added status column to appointments');
}
if (!columns.some(col => col.name === 'therapist_id')) {
  db.exec("ALTER TABLE appointments ADD COLUMN therapist_id INTEGER REFERENCES therapists(id) ON DELETE SET NULL");
  console.log('✅ Migration: added therapist_id column to appointments');
}

const invoiceColumns = db.prepare("PRAGMA table_info(invoices)").all() as { name: string }[];
if (!invoiceColumns.some(col => col.name === 'dunning_level')) {
  db.exec("ALTER TABLE invoices ADD COLUMN dunning_level INTEGER NOT NULL DEFAULT 0");
  console.log('✅ Migration: added dunning_level column to invoices');
}
if (!invoiceColumns.some(col => col.name === 'dunning_date')) {
  db.exec("ALTER TABLE invoices ADD COLUMN dunning_date TEXT");
  console.log('✅ Migration: added dunning_date column to invoices');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS therapists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#2563EB',
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

const therapistCount = db.prepare('SELECT COUNT(*) as count FROM therapists').get() as { count: number };
if (therapistCount.count === 0) {
  db.prepare('INSERT INTO therapists (name, color) VALUES (?, ?)').run('Standard-Therapeut/in', '#2563EB');
  console.log('✅ Migration: seeded default therapist');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS vouchers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    patient_id INTEGER,
    description TEXT NOT NULL,
    value REAL NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    used_date TEXT,
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_appointments_therapist ON appointments(therapist_id);
  CREATE INDEX IF NOT EXISTS idx_invoices_dunning_level ON invoices(dunning_level);
  CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
  CREATE INDEX IF NOT EXISTS idx_vouchers_patient ON vouchers(patient_id);
  CREATE INDEX IF NOT EXISTS idx_vouchers_used ON vouchers(used);
`);

console.log('✅ Database initialized at:', dbPath);

export default db;
