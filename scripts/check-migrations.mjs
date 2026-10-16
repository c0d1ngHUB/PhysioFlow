import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import Database from 'better-sqlite3';
import { createMigrator, runMigrations } from '../server/db/migrator.ts';

const expected = readdirSync(new URL('../server/db/migrations/', import.meta.url))
  .filter(name => name.endsWith('.ts') && !name.endsWith('.d.ts')).length;
const db = new Database(':memory:');
db.pragma('foreign_keys = ON');
try {
  const migrator = createMigrator(db);
  assert.equal((await migrator.pending()).length, expected);
  await runMigrations(db);
  assert.equal((await migrator.executed()).length, expected);
  assert.equal((await migrator.pending()).length, 0);
  await runMigrations(db);
  assert.equal((await migrator.executed()).length, expected);
  // Exercise the library CLI as well as the programmatic API: an apparently
  // audit-clean transitive parser replacement must not silently break migration tools.
  assert.equal(await migrator.runAsCLI(['pending']), true);
  db.transaction(() => {
    db.exec('CREATE TABLE hygiene_probe (id INTEGER PRIMARY KEY, value TEXT NOT NULL)');
    db.prepare('INSERT INTO hygiene_probe (value) VALUES (?)').run('synthetic');
  })();
  assert.equal(db.prepare('SELECT value FROM hygiene_probe WHERE id = ?').get(1).value, 'synthetic');
  assert.throws(() => db.transaction(() => {
    db.prepare('INSERT INTO hygiene_probe (value) VALUES (?)').run('must-roll-back');
    throw new Error('synthetic rollback');
  })(), /synthetic rollback/);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM hygiene_probe').get().n, 1);
  console.log(JSON.stringify({ migrations: expected, idempotent: true, cli: true, transactions: true }));
} finally {
  db.close();
}
