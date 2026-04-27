import Database from 'better-sqlite3';

export function up(db: Database.Database) {
  const columns = db.prepare("PRAGMA table_info(appointments)").all() as { name: string }[];
  if (!columns.some(col => col.name === 'status')) {
    db.exec("ALTER TABLE appointments ADD COLUMN status TEXT NOT NULL DEFAULT 'scheduled'");
  }
  if (!columns.some(col => col.name === 'therapist_id')) {
    db.exec("ALTER TABLE appointments ADD COLUMN therapist_id INTEGER REFERENCES therapists(id) ON DELETE SET NULL");
  }
}

export function down(_db: Database.Database) {
  // SQLite doesn't support dropping columns easily - this is a no-op
  console.log('⚠️ Cannot safely drop columns in SQLite — migration is irreversible');
}
