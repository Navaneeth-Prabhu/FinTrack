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
      mode TEXT NOT NULL,
      sourceType TEXT NOT NULL,
      recurringId TEXT,
      FOREIGN KEY (categoryId) REFERENCES categories (id),
      FOREIGN KEY (recurringId) REFERENCES recurring_transactions (id)
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
