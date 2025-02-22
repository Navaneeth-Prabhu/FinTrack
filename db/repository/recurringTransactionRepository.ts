// src/database/recurringTransactionRepository.ts
import { RecurringTransaction } from '@/types';
import { initDatabase } from '../services/sqliteService';

export const saveRecurringTransactionToDB = async (transaction: RecurringTransaction): Promise<void> => {
  const db = await initDatabase();
  await db.runAsync(
    `INSERT INTO recurring_transactions (id, amount, type, categoryId, frequency, startDate, endDate, description, payee)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    transaction.id,
    transaction.amount,
    transaction.type,
    transaction.categoryId,
    transaction.frequency,
    transaction.startDate,
    transaction.endDate || null,
    transaction.description || null,
    transaction.payee || null
  );
};

export const fetchRecurringTransactionsFromDB = async (): Promise<RecurringTransaction[]> => {
  const db = await initDatabase();
  const transactions = await db.getAllAsync(`SELECT * FROM recurring_transactions`);
  
  return transactions.map((row: any) => ({
    id: row.id,
    amount: row.amount,
    type: row.type,
    categoryId: row.categoryId,
    frequency: row.frequency,
    startDate: row.startDate,
    endDate: row.endDate,
    description: row.description,
    payee: row.payee,
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
         startDate = ?, 
         endDate = ?, 
         description = ?, 
         payee = ?
     WHERE id = ?`,
    transaction.amount,
    transaction.type,
    transaction.categoryId,
    transaction.frequency,
    transaction.startDate,
    transaction.endDate || null,
    transaction.description || null,
    transaction.payee || null,
    transaction.id
  );

  // Fetch and return the updated transaction
  const transactions = await fetchRecurringTransactionsFromDB();
  return transactions.find(t => t.id === transaction.id)!;
};

export const deleteRecurringTransactionFromDB = async (id: string): Promise<void> => {
  const db = await initDatabase();
  await db.runAsync('DELETE FROM recurring_transactions WHERE id = ?', id);
};