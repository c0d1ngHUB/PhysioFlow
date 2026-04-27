import Database from 'better-sqlite3';

export function up(db: Database.Database) {
  try {
    db.prepare('ALTER TABLE patients ADD COLUMN insurance_number TEXT').run();
  } catch { /* already exists */ }
  try {
    db.prepare('ALTER TABLE patients ADD COLUMN address TEXT').run();
  } catch { /* already exists */ }
}

export function down() {
  console.log('⚠️ Cannot safely drop columns in SQLite');
}
