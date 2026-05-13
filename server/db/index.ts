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

// Lightweight migrations for existing local databases.
const patientColumns = db.prepare(`PRAGMA table_info(patients)`).all() as Array<{ name: string }>;
const patientColumnNames = new Set(patientColumns.map((column) => column.name));

if (!patientColumnNames.has('insurance_number')) {
  db.exec('ALTER TABLE patients ADD COLUMN insurance_number TEXT');
}

if (!patientColumnNames.has('address')) {
  db.exec('ALTER TABLE patients ADD COLUMN address TEXT');
}

if (!patientColumnNames.has('is_archived')) {
  db.exec('ALTER TABLE patients ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0');
}

if (!patientColumnNames.has('archived_at')) {
  db.exec('ALTER TABLE patients ADD COLUMN archived_at TEXT');
}

const appointmentColumns = db.prepare(`PRAGMA table_info(appointments)`).all() as Array<{ name: string }>;
const appointmentColumnNames = new Set(appointmentColumns.map((column) => column.name));

if (!appointmentColumnNames.has('treatment_notes')) {
  db.exec('ALTER TABLE appointments ADD COLUMN treatment_notes TEXT');
}

if (!appointmentColumnNames.has('treatment_services')) {
  db.exec('ALTER TABLE appointments ADD COLUMN treatment_services TEXT');
}

if (!appointmentColumnNames.has('next_appointment_date')) {
  db.exec('ALTER TABLE appointments ADD COLUMN next_appointment_date TEXT');
}

if (!appointmentColumnNames.has('treatment_completed_at')) {
  db.exec('ALTER TABLE appointments ADD COLUMN treatment_completed_at TEXT');
}

console.log('✅ Database initialized at:', dbPath);

export default db;
