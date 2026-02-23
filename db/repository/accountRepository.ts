import { Account } from '@/types';
import { initDatabase } from '../services/sqliteService';
import { v4 as uuidv4 } from 'uuid';

export const saveAccountToDB = async (account: Account): Promise<void> => {
    const db = await initDatabase();
    await db.runAsync(
        `INSERT INTO accounts (id, name, type, balance, currency, isIncludeInNetWorth, color, icon, provider, accountNumber)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        account.id,
        account.name,
        account.type,
        account.balance,
        account.currency ?? 'INR',
        account.isIncludeInNetWorth ? 1 : 0,
        account.color ?? null,
        account.icon ?? null,
        account.provider ?? null,
        account.accountNumber ?? null
    );
};

export const fetchAccountsFromDB = async (): Promise<Account[]> => {
    const db = await initDatabase();
    const result = await db.getAllAsync(`SELECT * FROM accounts`);

    return result.map((row: any) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        balance: row.balance,
        currency: row.currency,
        isIncludeInNetWorth: row.isIncludeInNetWorth === 1,
        color: row.color,
        icon: row.icon,
        provider: row.provider,
        accountNumber: row.accountNumber,
    }));
};

export const updateAccountInDB = async (account: Account): Promise<void> => {
    const db = await initDatabase();
    await db.runAsync(
        `UPDATE accounts 
         SET name = ?, type = ?, balance = ?, currency = ?, isIncludeInNetWorth = ?, color = ?, icon = ?, provider = ?, accountNumber = ?
         WHERE id = ?;`,
        account.name,
        account.type,
        account.balance,
        account.currency ?? 'INR',
        account.isIncludeInNetWorth ? 1 : 0,
        account.color ?? null,
        account.icon ?? null,
        account.provider ?? null,
        account.accountNumber ?? null,
        account.id
    );
};

export const deleteAccountFromDB = async (id: string): Promise<void> => {
    const db = await initDatabase();
    await db.runAsync('DELETE FROM accounts WHERE id = ?;', id);
};

export const updateAccountBalance = async (id: string, amountChange: number): Promise<void> => {
    const db = await initDatabase();
    await db.runAsync(
        `UPDATE accounts SET balance = balance + ? WHERE id = ?;`,
        amountChange,
        id
    );
};
