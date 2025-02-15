// src/database/transactionRepository.ts
import { Transaction } from '@/types';
import { initDatabase } from '../services/sqliteService';

export const saveTransactionToDB = async (transaction: Transaction): Promise<void> => {
    const db = await initDatabase();
    await db.runAsync(
        `INSERT INTO transactions (id, amount, type, date, paidTo, paidBy, createdAt, lastModified, categoryId, modeId, sourceType)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        transaction.id,
        transaction.amount,
        transaction.type,
        transaction.date,
        transaction.paidTo ?? null,
        transaction.paidBy ?? null,
        transaction.createdAt,
        transaction.lastModified,
        transaction.category.id,
        '1', // Default modeId
        transaction.source.type
    );
};

export const fetchTransactionsFromDB = async (): Promise<Transaction[]> => {
    const db = await initDatabase();

    // Join transactions with categories to fetch category details
    const transactions = await db.getAllAsync(`
        SELECT 
          t.id, 
          t.amount, 
          t.type, 
          t.date, 
          t.createdAt, 
          t.lastModified, 
          t.categoryId,
          t.paidTo,
          t.paidBy,
          t.sourceType,
          c.id as categoryId, 
          c.name as categoryName, 
          c.icon as categoryIcon, 
          c.type as categoryType, 
          c.color as categoryColor
        FROM transactions t
        LEFT JOIN categories c
        ON t.categoryId = c.id
      `);


    // Map the result to include category as an object
    return transactions.map((row: any) => ({
        id: row.id,
        amount: row.amount,
        type: row.type,
        date: row.date,
        paidTo: row.paidTo,
        paidBy: row.paidBy,
        createdAt: row.createdAt,
        lastModified: row.lastModified,
        category: {
            id: row.categoryId,
            name: row.categoryName,
            icon: row.categoryIcon,
            type: row.categoryType,
            color: row.categoryColor,
        },
        source: { type: row.sourceType },
    }));
};

export const updateTransactionInDB = async (transaction: Transaction): Promise<Transaction> => {
    const db = await initDatabase();
    await db.runAsync(
        `UPDATE transactions 
         SET amount = ?, 
             type = ?, 
             date = ?, 
             paidTo = ?, 
             paidBy = ?, 
             lastModified = ?, 
             categoryId = ?, 
             sourceType = ?
         WHERE id = ?`,
        transaction.amount,
        transaction.type,
        transaction.date,
        transaction.paidTo ?? null,
        transaction.paidBy ?? null,
        transaction.lastModified,
        transaction.category.id,
        transaction.source.type,
        transaction.id
    );

    // Fetch and return the updated transaction
    const updatedTransactions = await fetchTransactionsFromDB();
    return updatedTransactions.find(t => t.id === transaction.id)!;
};

export const deleteTransactionFromDB = async (id: string): Promise<void> => {
    const db = await initDatabase();
    await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
};
