// src/database/sqliteService.ts

import { Category } from '@/types';
import * as SQLite from 'expo-sqlite';

const categoryConstants: Category[] = [
  { id: '1', name: 'Bills & Utilities', icon: '📄', type: 'expense', color: '#0B7189' },
  { id: '2', name: 'Salary', icon: '💼', type: 'income', color: '#FFD275' },
  { id: '3', name: 'Food', icon: '🍉', type: 'expense', color: '#DB5A42' },
  { id: '4', name: 'Groceries', icon: '🥕', type: 'expense', color: '#ABDF75' },
  { id: '5', name: 'Travelling', icon: '✈️', type: 'expense', color: '#ABDF75' },
  { id: '6', name: 'Entertainment', icon: '🎬', type: 'expense', color: '#ABDF75' },
  { id: '7', name: 'Medical', icon: '💊', type: 'expense', color: '#ABDF75' },
  { id: '8', name: 'Education', icon: '🎓', type: 'expense', color: '#ABDF75' },
  { id: '9', name: 'Gift', icon: '🎁', type: 'expense', color: '#ABDF75' },
  { id: '101', name: 'Other', icon: '...', type: 'expense', color: 'white' },
  { id: '102', name: 'Coupons', icon: '🏷️', type: 'income', color: '#FFD275' },
];

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db !== null) return db;

  db = await SQLite.openDatabaseAsync('transactions.db');

  // Initialize tables
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL
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
      modeId TEXT NOT NULL,
      sourceType TEXT NOT NULL,
      FOREIGN KEY (categoryId) REFERENCES categories (id)
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY NOT NULL,
      amount REAL NOT NULL,
      frequency TEXT NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      spent REAL NOT NULL,
      progress REAL NOT NULL,
      categoryId TEXT NOT NULL,
      FOREIGN KEY (categoryId) REFERENCES categories (id)
    );

    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id TEXT PRIMARY KEY NOT NULL,
      transaction_id TEXT NOT NULL,
      frequency TEXT NOT NULL,
      interval INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      day_of_month INTEGER,
      day_of_week INTEGER,
      last_processed_date TEXT,
      next_processing_date TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      FOREIGN KEY (transaction_id) REFERENCES transactions (id)
    );
  `);

  // Insert default categories if not present
  for (const category of categoryConstants) {
    await db.runAsync(
      `INSERT OR IGNORE INTO categories (id, name, type, color, icon)
       VALUES (?, ?, ?, ?, ?);`,
      category.id,
      category.name,
      category.type,
      category.color,
      category.icon
    );
  }

  return db;
};
