import Database from 'better-sqlite3';

export function up(db: Database.Database) {
  const columns = db.prepare("PRAGMA table_info(audit_logs)").all() as { name: string }[];
  if (!columns.some(col => col.name === 'user_id')) {
    db.exec("ALTER TABLE audit_logs ADD COLUMN user_id INTEGER");
  }
  if (!columns.some(col => col.name === 'entity_type')) {
    db.exec("ALTER TABLE audit_logs ADD COLUMN entity_type TEXT");
  }
  if (!columns.some(col => col.name === 'entity_id')) {
    db.exec("ALTER TABLE audit_logs ADD COLUMN entity_id TEXT");
  }
  if (!columns.some(col => col.name === 'old_value')) {
    db.exec("ALTER TABLE audit_logs ADD COLUMN old_value TEXT");
  }
  if (!columns.some(col => col.name === 'new_value')) {
    db.exec("ALTER TABLE audit_logs ADD COLUMN new_value TEXT");
  }
}

export function down() {
  console.log('⚠️ Cannot safely drop columns in SQLite');
}
