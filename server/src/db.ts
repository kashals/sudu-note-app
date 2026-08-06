import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const dbPath = process.env.DB_PATH || './notes.db';
const resolvedPath = path.resolve(dbPath);

let dbInstance: Database | null = null;

// get database instance
export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  // open database connection
  dbInstance = await open({
    filename: resolvedPath,
    driver: sqlite3.Database
  });

  // enable foreign keys
  await dbInstance.run('PRAGMA foreign_keys = ON;');

  // initialize database schema
  await initSchema(dbInstance);

  return dbInstance;
}

// initialize database schema
async function initSchema(db: Database): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}
