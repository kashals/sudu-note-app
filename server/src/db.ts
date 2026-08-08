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

// initialize database schema and run migrations
async function initSchema(db: Database): Promise<void> {
  // Notes table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Folders table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#3b82f6',
      is_locked INTEGER NOT NULL DEFAULT 0,
      pin_hash TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Add category column if missing
  try {
    await db.exec("ALTER TABLE notes ADD COLUMN category TEXT DEFAULT 'Document';");
  } catch (err) {
    // column already exists
  }

  // Add is_pinned column if missing
  try {
    await db.exec("ALTER TABLE notes ADD COLUMN is_pinned INTEGER DEFAULT 0;");
  } catch (err) {
    // column already exists
  }

  // Add is_archived column if missing
  try {
    await db.exec("ALTER TABLE notes ADD COLUMN is_archived INTEGER DEFAULT 0;");
  } catch (err) {
    // column already exists
  }

  // Add tags column if missing
  try {
    await db.exec("ALTER TABLE notes ADD COLUMN tags TEXT DEFAULT '[]';");
  } catch (err) {
    // column already exists
  }

  // Add folder_id column to notes if missing
  try {
    await db.exec("ALTER TABLE notes ADD COLUMN folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL;");
  } catch (err) {
    // column already exists
  }

  // System settings table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}
