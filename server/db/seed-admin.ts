import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../data/physioflow.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

const username = process.argv[2] || 'admin';
const password = process.argv[3] || 'physioflow';
const role = process.argv[4] || 'admin';

const SALT_ROUNDS = 12;

async function main() {
  const hash = await bcrypt.hash(password, SALT_ROUNDS);

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as { id: number } | undefined;

  if (existing) {
    db.prepare('UPDATE users SET password_hash = ?, role = ? WHERE username = ?').run(hash, role, username);
    console.log(`✅ Updated user "${username}" (role: ${role})`);
  } else {
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, hash, role);
    console.log(`✅ Created user "${username}" (role: ${role})`);
  }

  console.log(`   Password hash: ${hash}`);
  db.close();
}

main().catch(err => { console.error(err); process.exit(1); });