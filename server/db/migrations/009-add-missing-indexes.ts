import Database from 'better-sqlite3';

export function up(db: Database.Database) {
  try { db.prepare('CREATE INDEX idx_appointments_status ON appointments(status)').run(); } catch { /* already exists */ }
  try { db.prepare('CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp)').run(); } catch { /* already exists */ }
  try { db.prepare('CREATE INDEX idx_audit_logs_action ON audit_logs(action)').run(); } catch { /* already exists */ }
}

export function down() {
  console.log('⚠️ Cannot safely drop indexes in down migration');
}
