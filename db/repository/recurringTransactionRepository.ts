// src/database/recurringTransactionRepository.ts
import { RecurringTransaction } from '@/types';
import { initDatabase } from '../services/sqliteService';

export const saveRecurringTransactionToDB = async (transaction: RecurringTransaction): Promise<void> => {
  const db = await initDatabase();
  await db.runAsync(
    `INSERT INTO recurring_transactions (id, amount, type, categoryId, frequency, interval, startDate, endDate, description, payee, time, lastGeneratedDate, isActive, createdAt, lastModified)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    transaction.id,
    transaction.amount,
    transaction.type,
    transaction.category.id,
    transaction.frequency,
    transaction.interval,
    transaction.startDate,
    transaction.endDate || null, // SQLite accepts null for optional fields
    transaction.description || null,
    transaction.payee || null,
    transaction.time || null,
    transaction.lastGeneratedDate || null, // SQLite stores undefined as null
    transaction.isActive,
    transaction.createdAt,
    transaction.lastModified
  );
};

// Rest of the file remains largely the same, just ensure type consistency
export const fetchRecurringTransactionsFromDB = async (): Promise<RecurringTransaction[]> => {
  const db = await initDatabase();
  const transactions = await db.getAllAsync(`
    SELECT 
      r.*,
      c.id AS categoryId, 
      c.name AS categoryName, 
      c.icon AS categoryIcon, 
      c.type AS categoryType, 
      c.color AS categoryColor
    FROM recurring_transactions r
    LEFT JOIN categories c ON r.categoryId = c.id
  `);

  return transactions.map((row: any) => ({
    id: row.id,
    amount: row.amount,
    type: row.type,
    categoryId: row.categoryId,
    // Add category object similar to transactions
    category: row.categoryId ? {
      id: row.categoryId,
      name: row.categoryName,
      icon: row.categoryIcon,
      type: row.categoryType,
      color: row.categoryColor,
    } : null,
    frequency: row.frequency,
    interval: row.interval,
    startDate: row.startDate,
    endDate: row.endDate || undefined, // Convert null back to undefined
    description: row.description || undefined,
    payee: row.payee || undefined,
    time: row.time || undefined,
    lastGeneratedDate: row.lastGeneratedDate || undefined, // Convert null back to undefined
    isActive: row.isActive,
    createdAt: row.createdAt,
    lastModified: row.lastModified,
  }));
};


export const updateRecurringTransactionInDB = async (transaction: RecurringTransaction): Promise<RecurringTransaction> => {
  const db = await initDatabase();
  await db.runAsync(
    `UPDATE recurring_transactions 
     SET amount = ?, 
         type = ?, 
         categoryId = ?, 
         frequency = ?, 
         interval = ?,
         startDate = ?, 
         endDate = ?, 
         description = ?, 
         payee = ?, 
         time = ?,
         lastGeneratedDate = ?,
         isActive = ?,
         createdAt = ?,
         lastModified = ?
     WHERE id = ?`,
    transaction.amount,
    transaction.type,
    transaction.category.id,
    transaction.frequency,
    transaction.interval,
    transaction.startDate,
    transaction.endDate || null,
    transaction.description || null,
    transaction.payee || null,
    transaction.time || null,
    transaction.lastGeneratedDate || null,
    transaction.isActive,
    transaction.createdAt,
    transaction.lastModified,
    transaction.id
  );

  const transactions = await fetchRecurringTransactionsFromDB();
  return transactions.find(t => t.id === transaction.id)!;
};

export const deleteRecurringTransactionFromDB = async (id: string): Promise<void> => {
  const db = await initDatabase();
  await db.runAsync('DELETE FROM recurring_transactions WHERE id = ?', id);
};