import Database from 'better-sqlite3';

export function up(db: Database.Database) {
  try {
    db.prepare('ALTER TABLE invoices ADD COLUMN paid_at TEXT').run();
  } catch { /* already exists */ }

  // Backfill: set paid_at = created_at for already-paid invoices where paid_at is null
  db.prepare("UPDATE invoices SET paid_at = created_at WHERE paid = 1 AND paid_at IS NULL").run();
}

export function down() {
  console.log('⚠️ Cannot safely drop columns in SQLite');
}