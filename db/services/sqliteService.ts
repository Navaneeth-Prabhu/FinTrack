import { Category } from '@/types';
import * as SQLite from 'expo-sqlite';

import { categoryConstants, ColorsConstants } from '@/constants/categories';


let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db !== null) return db;

  db = await SQLite.openDatabaseAsync('transactions.db');

  // Initialize tables
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT,
      icon TEXT,
      type TEXT,
      color TEXT,
      orderId INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      balance REAL NOT NULL,
      currency TEXT,
      isIncludeInNetWorth INTEGER NOT NULL,
      color TEXT,
      icon TEXT,
      provider TEXT,
      accountNumber TEXT
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      paidTo TEXT,
      paidBy TEXT,
      lastModified TEXT NOT NULL,
      categoryId TEXT NOT NULL,
      mode TEXT NOT NULL,
      sourceType TEXT NOT NULL,
      recurringId TEXT,
      fromAccountId TEXT,
      toAccountId TEXT,
      refNumber TEXT,
      sourceRawData TEXT,
      FOREIGN KEY (categoryId) REFERENCES categories (id),
      FOREIGN KEY (recurringId) REFERENCES recurring_transactions (id),
      FOREIGN KEY (fromAccountId) REFERENCES accounts (id),
      FOREIGN KEY (toAccountId) REFERENCES accounts (id)
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      budget_limit REAL NOT NULL,
      frequency TEXT NOT NULL,
      period_length INTEGER,
      startDate TEXT NOT NULL,
      endDate TEXT,
      categoryId TEXT NOT NULL,
      isRecurring INTEGER NOT NULL,
      name TEXT,
      FOREIGN KEY (categoryId) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
      categoryId TEXT NOT NULL,
      startDate TEXT NOT NULL,
      interval INTEGER DEFAULT 1 CHECK (interval >= 1),
      description TEXT,
      endDate TEXT,
      time TEXT,
      payee TEXT,
      mode TEXT,
      isActive INTEGER DEFAULT 1 CHECK (isActive IN (0, 1)),
      lastGeneratedDate TEXT,
      lastModified TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (categoryId) REFERENCES categories (id)
    );

    CREATE TABLE IF NOT EXISTS processed_sms_ids (
      id TEXT PRIMARY KEY NOT NULL,
      processedAt INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
  `);

  // Safe migrations for existing databases
  try {
    await db.execAsync(`
      ALTER TABLE transactions ADD COLUMN fromAccountId TEXT REFERENCES accounts(id);
    `);
  } catch (e) {
    // Column might already exist
  }

  try {
    await db.execAsync(`
      ALTER TABLE transactions ADD COLUMN toAccountId TEXT REFERENCES accounts(id);
    `);
  } catch (e) {
    // Column might already exist
  }

  try {
    await db.execAsync(`
      ALTER TABLE transactions ADD COLUMN refNumber TEXT;
    `);
  } catch (e) {
    // Column might already exist
  }

  try {
    await db.execAsync(`
      ALTER TABLE transactions ADD COLUMN sourceRawData TEXT;
    `);
  } catch (e) {
    // Column might already exist
  }

  try {
    await db.execAsync(`
      ALTER TABLE accounts ADD COLUMN provider TEXT;
    `);
  } catch (e) {
    // Column might already exist
  }

  try {
    await db.execAsync(`
      ALTER TABLE accounts ADD COLUMN accountNumber TEXT;
    `);
  } catch (e) {
    // Column might already exist
  }

  let categoriesAdded = 0;

  // Insert default categories if not present
  for (const category of categoryConstants) {
    await db.runAsync(
      `INSERT OR IGNORE INTO categories (id, name, type, color, icon, orderId) 
       VALUES (?, ?, ?, ?, ?, ?);`,
      category.id,
      category.name,
      category.type,
      category.color,
      category.icon,
      category.order ?? 0
    );
    categoriesAdded++;
  }

  return db;
};

// ─── SMS Deduplication helpers ────────────────────────────────────────────────

export const saveProcessedSmsIdsToDb = async (ids: string[], processedAt: number = Date.now()): Promise<void> => {
  if (!db || ids.length === 0) return;

  try {
    // Begin transaction for bulk insert
    await db.execAsync('BEGIN TRANSACTION');

    // SQLite doesn't easily support dynamic bulk inserts parameterized, so we use a prepared statement
    const statement = await db.prepareAsync('INSERT OR IGNORE INTO processed_sms_ids (id, processedAt) VALUES (?, ?)');
    try {
      for (const id of ids) {
        await statement.executeAsync(id, processedAt);
      }
    } finally {
      await statement.finalizeAsync();
    }

    await db.execAsync('COMMIT');
  } catch (err) {
    if (db) await db.execAsync('ROLLBACK');
    console.error('[SQLite] Error saving SMS IDs:', err);
  }
};

export const getProcessedSmsIdsFromDb = async (): Promise<string[]> => {
  if (!db) return [];
  try {
    // Return all known IDs. Since it's SQLite, looking up is fast.
    const result = await db.getAllAsync<{ id: string }>('SELECT id FROM processed_sms_ids');
    return result.map(r => r.id);
  } catch (err) {
    console.error('[SQLite] Error getting SMS IDs:', err);
    return [];
  }
};

/** 
 * We use the 'WATERMARK' special row in the processed_sms_ids table 
 * to track the global last-processed timestamp.
 */
export const setSmsWatermarkInDb = async (timestamp: number): Promise<void> => {
  if (!db || isNaN(timestamp) || timestamp <= 0) return;
  try {
    await db.runAsync(
      'INSERT OR REPLACE INTO processed_sms_ids (id, processedAt) VALUES (?, ?)',
      'WATERMARK',
      timestamp
    );
  } catch (err) {
    console.error('[SQLite] Error setting SMS watermark:', err);
  }
};

export const getSmsWatermarkFromDb = async (): Promise<number> => {
  if (!db) return 0;
  try {
    const result = await db.getFirstAsync<{ processedAt: number }>(
      'SELECT processedAt FROM processed_sms_ids WHERE id = ?',
      'WATERMARK'
    );
    return result?.processedAt ?? 0;
  } catch (err) {
    console.error('[SQLite] Error getting SMS watermark:', err);
    return 0;
  }
};