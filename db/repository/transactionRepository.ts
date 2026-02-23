// src/database/transactionRepository.ts
import { Transaction } from '@/types';
import { initDatabase } from '../services/sqliteService';

export const saveTransactionToDB = async (transaction: Transaction): Promise<void> => {
    const db = await initDatabase();
    console.log('Saving transaction:', transaction);
    await db.runAsync(
        `INSERT INTO transactions (id, amount, type, date, paidTo, paidBy, createdAt, lastModified, categoryId, mode, sourceType, recurringId, fromAccountId, toAccountId, refNumber, sourceRawData)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        transaction.id,
        transaction.amount,
        transaction.type,
        transaction.date,
        transaction.paidTo ?? null,
        transaction.paidBy ?? null,
        transaction.createdAt,
        transaction.lastModified,
        transaction.category?.id ?? null,
        transaction.mode,
        transaction.source.type,
        transaction.recurringId ?? null,
        transaction.fromAccount?.id ?? null,
        transaction.toAccount?.id ?? null,
        transaction.refNumber ?? null,
        transaction.source.rawData ?? null
    );
};

const mapRowToTransaction = (row: any): Transaction => ({
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
    source: { type: row.sourceType, rawData: row.sourceRawData || undefined },
    mode: row.mode,
    recurringId: row.recurringId || undefined,
    fromAccount: row.fromAccountId ? { id: row.fromAccountId, name: row.fromAccountName } : undefined,
    toAccount: row.toAccountId ? { id: row.toAccountId, name: row.toAccountName } : undefined,
    refNumber: row.refNumber || undefined,
});

const baseSelectQuery = `
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
    t.fromAccountId,
    t.toAccountId,
    t.refNumber,
    t.sourceRawData,
    c.id AS categoryId, 
    c.name AS categoryName, 
    c.icon AS categoryIcon, 
    c.type AS categoryType, 
    c.color AS categoryColor,
    a1.name AS fromAccountName,
    a2.name AS toAccountName
  FROM transactions t
  LEFT JOIN categories c ON t.categoryId = c.id
  LEFT JOIN accounts a1 ON t.fromAccountId = a1.id
  LEFT JOIN accounts a2 ON t.toAccountId = a2.id
`;

export const fetchTransactionsFromDB = async (limit?: number, offset: number = 0): Promise<Transaction[]> => {
    const db = await initDatabase();

    let query = baseSelectQuery + ' ORDER BY t.date DESC';
    const params: any[] = [];

    if (limit !== undefined) {
        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);
    }

    const transactions = await db.getAllAsync(query, params);
    return transactions.map(mapRowToTransaction);
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
             recurringId = ?,
             fromAccountId = ?,
             toAccountId = ?,
             refNumber = ?,
             sourceRawData = ?
         WHERE id = ?`,
        transaction.amount,
        transaction.type,
        transaction.date,
        transaction.paidTo ?? null,
        transaction.paidBy ?? null,
        transaction.lastModified,
        transaction.category?.id ?? null,
        transaction.source.type,
        transaction.mode,
        transaction.recurringId ?? null,
        transaction.fromAccount?.id ?? null,
        transaction.toAccount?.id ?? null,
        transaction.refNumber ?? null,
        transaction.source.rawData ?? null,
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
                    `INSERT INTO transactions (id, amount, type, date, paidTo, paidBy, createdAt, lastModified, categoryId, mode, sourceType, fromAccountId, toAccountId, refNumber)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
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
                    transaction.source.type,
                    transaction.fromAccount?.id ?? null,
                    transaction.toAccount?.id ?? null,
                    transaction.refNumber ?? null
                )
            );
            await Promise.all(insertPromises);
        });
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
                         sourceType = ?,
                         fromAccountId = ?,
                         toAccountId = ?
                     WHERE id = ?`,
                    transaction.amount,
                    transaction.type,
                    transaction.date,
                    transaction.paidTo ?? null,
                    transaction.paidBy ?? null,
                    transaction.lastModified,
                    transaction.category.id,
                    transaction.source.type,
                    transaction.fromAccount?.id ?? null,
                    transaction.toAccount?.id ?? null,
                    transaction.id
                )
            );
            await Promise.all(updatePromises);
        });
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

export const findTransactionsByPayee = async (
    payee: string,
    type: 'income' | 'expense' | 'transfer' | 'investment',
    excludeId?: string
): Promise<Transaction[]> => {
    const db = await initDatabase();
    let query = '';
    let params: any[] = [];

    if (type === 'expense' || type === 'transfer' || type === 'investment') {
        query = `${baseSelectQuery}
                 WHERE TRIM(UPPER(t.paidTo)) = TRIM(UPPER(?)) AND t.type = ?`;
        params = [payee, type];
    } else if (type === 'income') {
        query = `${baseSelectQuery}
                 WHERE TRIM(UPPER(t.paidBy)) = TRIM(UPPER(?)) AND t.type = ?`;
        params = [payee, type];
    }

    if (excludeId) {
        query += ` AND t.id != ?`;
        params.push(excludeId);
    }

    const transactions = await db.getAllAsync(query, ...params);
    return transactions.map(mapRowToTransaction);
};

export const getMostRecentCategoryForPayee = async (
    payee: string,
    type: 'income' | 'expense' | 'transfer' | 'investment'
): Promise<string | null> => {
    const db = await initDatabase();
    let query = '';
    let params: any[] = [];

    if (type === 'expense' || type === 'transfer' || type === 'investment') {
        query = `SELECT categoryId FROM transactions 
                 WHERE TRIM(UPPER(paidTo)) = TRIM(UPPER(?)) AND type = ? 
                 ORDER BY date DESC LIMIT 1`;
        params = [payee, type];
    } else if (type === 'income') {
        query = `SELECT categoryId FROM transactions 
                 WHERE TRIM(UPPER(paidBy)) = TRIM(UPPER(?)) AND type = ? 
                 ORDER BY date DESC LIMIT 1`;
        params = [payee, type];
    } else {
        return null;
    }

    const result = await db.getFirstAsync<{ categoryId: string }>(query, ...params);
    return result?.categoryId || null;
};

export const fetchFilteredTransactionsFromDB = async (
    type?: 'income' | 'expense' | 'transfer' | 'investment',
    startDate?: string,
    endDate?: string
): Promise<Transaction[]> => {
    const db = await initDatabase();
    let query = `${baseSelectQuery} WHERE 1=1`;
    const params: any[] = [];

    if (type) {
        query += ` AND t.type = ?`;
        params.push(type);
    }

    if (startDate) {
        query += ` AND t.date >= ?`;
        params.push(startDate);
    }

    if (endDate) {
        query += ` AND t.date <= ?`;
        params.push(endDate);
    }

    query += ` ORDER BY t.date DESC`;

    const transactions = await db.getAllAsync(query, ...params);
    return transactions.map(mapRowToTransaction);
};