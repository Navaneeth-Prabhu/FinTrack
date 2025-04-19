import { Category } from '@/types';
import * as SQLite from 'expo-sqlite';

import { ColorsConstants } from '@/constants/categories';

const categoryConstants: Category[] = [
  { id: '1', name: 'Bills & Utilities', icon: '📄', type: 'expense', color: ColorsConstants[0], order: 1 },
  { id: '2', name: 'Salary', icon: '💼', type: 'income', color: ColorsConstants[1], order: 1 },
  { id: '3', name: 'Food', icon: '🍉', type: 'expense', color: ColorsConstants[2], order: 2 },
  { id: '4', name: 'Groceries', icon: '🥕', type: 'expense', color: ColorsConstants[3], order: 3 },
  { id: '5', name: 'Travelling', icon: '✈️', type: 'expense', color: ColorsConstants[4], order: 4 },
  { id: '6', name: 'Entertainment', icon: '🎬', type: 'expense', color: ColorsConstants[5], order: 5 },
  { id: '7', name: 'Medical', icon: '💊', type: 'expense', color: ColorsConstants[6], order: 6 },
  { id: '8', name: 'Education', icon: '🎓', type: 'expense', color: ColorsConstants[7], order: 7 },
  { id: '9', name: 'Gift', icon: '🎁', type: 'expense', color: ColorsConstants[8], order: 8 },
  { id: '101', name: 'Other', icon: '...', type: 'expense', color: 'white', order: 9 },
  { id: '102', name: 'Coupons', icon: '🏷️', type: 'income', color: ColorsConstants[9], order: 2 },
];

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db !== null) return db;

  db = await SQLite.openDatabaseAsync('transactions.db');

  // Initialize tables
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT,
      icon TEXT,
      type TEXT,
      color TEXT,
      orderId INTEGER DEFAULT 0
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