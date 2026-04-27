import Database from 'better-sqlite3';

export function up(db: Database.Database) {
  const columns = db.prepare("PRAGMA table_info(invoices)").all() as { name: string }[];
  if (!columns.some(col => col.name === 'dunning_level')) {
    db.exec("ALTER TABLE invoices ADD COLUMN dunning_level INTEGER NOT NULL DEFAULT 0");
  }
  if (!columns.some(col => col.name === 'dunning_date')) {
    db.exec("ALTER TABLE invoices ADD COLUMN dunning_date TEXT");
  }
}

export function down() {
  console.log('⚠️ Cannot safely drop columns in SQLite');
}
