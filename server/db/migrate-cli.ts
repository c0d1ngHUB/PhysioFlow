import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { runMigrations } from './migrator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'physioflow.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

await runMigrations(db);

// Show current migration status
const { createMigrator } = await import('./migrator.js');
const migrator = createMigrator(db);
const executed = await migrator.executed();
const pending = await migrator.pending();

console.log('');
console.log('📦 Migration Status');
console.log('─────────────────');
console.log(`Executed: ${executed.length}`);
executed.forEach((m) => console.log(`  ✅ ${m.name}`));
if (pending.length > 0) {
  console.log(`Pending: ${pending.length}`);
  pending.forEach((m) => console.log(`  ⏳ ${m.name}`));
} else {
  console.log('Pending: 0 (all up to date)');
}
console.log('');

db.close();
