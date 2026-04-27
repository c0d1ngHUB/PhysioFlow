import Database from 'better-sqlite3';
import { Umzug } from 'umzug';
import path from 'path';
import { fileURLToPath } from 'url';
import { SqliteStorage } from './storage.js';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface MigrationModule {
  up: (db: Database.Database) => void | Promise<void>;
  down: (db: Database.Database) => void | Promise<void>;
}

export function createMigrator(db: Database.Database) {
  const migrationsDir = path.join(__dirname, 'migrations');

  // Collect migration files
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'))
    .sort();

  return new Umzug({
    migrations: files.map(file => ({
      name: file.replace('.ts', ''),
      up: async () => {
        const mod = await import(path.join(migrationsDir, file));
        const m = mod as MigrationModule;
        await m.up(db);
      },
      down: async () => {
        const mod = await import(path.join(migrationsDir, file));
        const m = mod as MigrationModule;
        await m.down(db);
      },
    })),
    storage: new SqliteStorage(db),
    logger: console,
  });
}

export async function runMigrations(db: Database.Database) {
  const migrator = createMigrator(db);
  const pending = await migrator.pending();
  if (pending.length > 0) {
    console.log(`📦 Running ${pending.length} pending migration(s)...`);
    await migrator.up();
    console.log('✅ Migrations complete');
  } else {
    console.log('✅ No pending migrations');
  }
}
