// src/database/transactionRepository.ts
import { Transaction } from '@/types';
import { initDatabase } from '../services/sqliteService';

// src/database/transactionRepository.ts
export const saveTransactionToDB = async (transaction: Transaction): Promise<void> => {
    const db = await initDatabase();
    console.log('Saving transaction:', transaction);
    await db.runAsync(
        `INSERT INTO transactions (id, amount, type, date, paidTo, paidBy, createdAt, lastModified, categoryId, mode, sourceType, recurringId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        transaction.id,
        transaction.amount,
        transaction.type,
        transaction.date,
        transaction.paidTo ?? null,
        transaction.paidBy ?? null,
        transaction.createdAt,
        transaction.lastModified,
        transaction.category?.id ?? null, // Safe access
        transaction.mode,
        transaction.source.type,
        transaction.recurringId ?? null
    );
};

export const fetchTransactionsFromDB = async (): Promise<Transaction[]> => {
    const db = await initDatabase();
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
        t.mode AS mode,
        t.recurringId,
        c.id AS categoryId, 
        c.name AS categoryName, 
        c.icon AS categoryIcon, 
        c.type AS categoryType, 
        c.color AS categoryColor
      FROM transactions t
      LEFT JOIN categories c ON t.categoryId = c.id
    `);

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
        mode: row.mode,
        recurringId: row.recurringId || undefined,
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
           sourceType = ?,
           mode = ?,
           recurringId = ?
       WHERE id = ?`,
        transaction.amount,
        transaction.type,
        transaction.date,
        transaction.paidTo ?? null,
        transaction.paidBy ?? null,
        transaction.lastModified,
        transaction.category?.id ?? null, // Safe access
        transaction.source.type,
        transaction.mode,
        transaction.recurringId ?? null,
        transaction.id
    );

    const updatedTransactions = await fetchTransactionsFromDB();
    return updatedTransactions.find(t => t.id === transaction.id)!;
};

export const deleteTransactionFromDB = async (id: string): Promise<void> => {
    const db = await initDatabase();
    await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
};

// Bulk Operations

export const saveBulkTransactionsToDB = async (transactions: Transaction[]): Promise<Transaction[]> => {
    const db = await initDatabase();
    try {
        await db.withTransactionAsync(async () => {
            const insertPromises = transactions.map(transaction =>
                db.runAsync(
                    `INSERT INTO transactions (id, amount, type, date, paidTo, paidBy, createdAt, lastModified, categoryId, mode, sourceType)
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
                    transaction.mode,
                    transaction.source.type
                )
            );
            await Promise.all(insertPromises);
        });
        // Return the transactions as saved (assuming IDs are pre-generated)
        return transactions;
    } catch (error) {
        throw new Error(`Failed to save bulk transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

export const updateBulkTransactionsInDB = async (transactions: Transaction[]): Promise<Transaction[]> => {
    const db = await initDatabase();
    try {
        await db.withTransactionAsync(async () => {
            const updatePromises = transactions.map(transaction =>
                db.runAsync(
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
                )
            );
            await Promise.all(updatePromises);
        });
        // Fetch updated transactions to ensure accuracy
        const updatedTransactions = await fetchTransactionsFromDB();
        return transactions.map(t => updatedTransactions.find(ut => ut.id === t.id)!);
    } catch (error) {
        throw new Error(`Failed to update bulk transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

export const deleteBulkTransactionsFromDB = async (ids: string[]): Promise<void> => {
    const db = await initDatabase();
    try {
        await db.withTransactionAsync(async () => {
            const placeholders = ids.map(() => '?').join(', ');
            await db.runAsync(
                `DELETE FROM transactions WHERE id IN (${placeholders})`,
                ids
            );
        });
    } catch (error) {
        throw new Error(`Failed to delete bulk transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};