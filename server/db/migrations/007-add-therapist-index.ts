import Database from 'better-sqlite3';

export function up(db: Database.Database) {
  db.exec('CREATE INDEX IF NOT EXISTS idx_appointments_therapist ON appointments(therapist_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_invoices_dunning_level ON invoices(dunning_level)');
}

export function down(db: Database.Database) {
  db.exec('DROP INDEX IF EXISTS idx_appointments_therapist');
  db.exec('DROP INDEX IF EXISTS idx_invoices_dunning_level');
}
