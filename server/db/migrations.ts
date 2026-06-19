import type Database from 'better-sqlite3';

const LATEST_SCHEMA_VERSION = 1;

function getUserVersion(db: Database.Database) {
  const row = db.pragma('user_version', { simple: true }) as number;
  return Number(row || 0);
}

function setUserVersion(db: Database.Database, version: number) {
  db.pragma(`user_version = ${version}`);
}

function hasColumn(db: Database.Database, table: string, columnName: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return columns.some((column) => column.name === columnName);
}

function addColumnIfMissing(db: Database.Database, table: string, columnName: string, definition: string) {
  if (!hasColumn(db, table, columnName)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
}

const migrations: Record<number, (db: Database.Database) => void> = {
  1: (db) => {
    addColumnIfMissing(db, 'patients', 'insurance_number', 'insurance_number TEXT');
    addColumnIfMissing(db, 'patients', 'address', 'address TEXT');
    addColumnIfMissing(db, 'patients', 'is_archived', 'is_archived INTEGER NOT NULL DEFAULT 0');
    addColumnIfMissing(db, 'patients', 'archived_at', 'archived_at TEXT');

    addColumnIfMissing(db, 'appointments', 'treatment_notes', 'treatment_notes TEXT');
    addColumnIfMissing(db, 'appointments', 'treatment_services', 'treatment_services TEXT');
    addColumnIfMissing(db, 'appointments', 'next_appointment_date', 'next_appointment_date TEXT');
    addColumnIfMissing(db, 'appointments', 'treatment_completed_at', 'treatment_completed_at TEXT');
    addColumnIfMissing(db, 'appointments', 'status', "status TEXT NOT NULL DEFAULT 'confirmed'");

    db.exec(`
      CREATE TABLE IF NOT EXISTS invoice_sequences (
        date_key TEXT PRIMARY KEY,
        last_sequence INTEGER NOT NULL
      );
    `);
  },
};

export function runMigrations(db: Database.Database) {
  const currentVersion = getUserVersion(db);

  if (currentVersion > LATEST_SCHEMA_VERSION) {
    throw new Error(`Database schema version ${currentVersion} is newer than supported version ${LATEST_SCHEMA_VERSION}`);
  }

  if (currentVersion === LATEST_SCHEMA_VERSION) {
    return;
  }

  const migrate = db.transaction(() => {
    for (let version = currentVersion + 1; version <= LATEST_SCHEMA_VERSION; version++) {
      migrations[version]?.(db);
      setUserVersion(db, version);
    }
  });

  migrate();
}
