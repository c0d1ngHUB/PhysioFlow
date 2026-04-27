import Database from 'better-sqlite3';

export function up(db: Database.Database) {
  const count = db.prepare('SELECT COUNT(*) as total FROM therapists').get() as { total: number };
  if (count.total === 0) {
    db.prepare('INSERT INTO therapists (name, color) VALUES (?, ?)').run('Standard-Therapeut/in', '#2563EB');
  }
}

export function down(db: Database.Database) {
  db.prepare("DELETE FROM therapists WHERE name = ?").run('Standard-Therapeut/in');
}
