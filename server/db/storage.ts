import Database from 'better-sqlite3';
import type { UmzugStorage } from 'umzug';

export class SqliteStorage implements UmzugStorage<unknown> {
  constructor(private db: Database.Database) {}

  async logMigration({ name }: { name: string }): Promise<void> {
    this.db.prepare('INSERT OR IGNORE INTO migrations (name) VALUES (?)').run(name);
  }

  async unlogMigration({ name }: { name: string }): Promise<void> {
    this.db.prepare('DELETE FROM migrations WHERE name = ?').run(name);
  }

  async executed(): Promise<string[]> {
    this.ensureTable();
    const rows = this.db.prepare('SELECT name FROM migrations ORDER BY name').all() as { name: string }[];
    return rows.map(r => r.name);
  }

  private ensureTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        name TEXT PRIMARY KEY
      )
    `);
  }
}
