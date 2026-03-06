import { InvestmentTransaction } from '@/types';
import { initDatabase } from '../services/sqliteService';

export const saveInvestmentTxToDB = async (tx: InvestmentTransaction): Promise<void> => {
    const db = await initDatabase();
    await db.runAsync(
        `INSERT INTO investment_transactions (
            id, user_id, holding_id, holding_type, event_type, amount,
            units, nav, price, quantity, balance_after, notes, event_date,
            source, sms_id, is_deleted, updated_at, created_at
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        tx.id,
        tx.user_id ?? null,
        tx.holding_id,
        tx.holding_type,
        tx.event_type,
        tx.amount,
        tx.units ?? null,
        tx.nav ?? null,
        tx.price ?? null,
        tx.quantity ?? null,
        tx.balance_after ?? null,
        tx.notes ?? null,
        tx.event_date,
        tx.source ?? 'manual',
        tx.sms_id ?? null,
        tx.is_deleted ? 1 : 0,
        tx.updated_at,
        tx.created_at
    );
};

export const fetchInvestmentTxsByHoldingId = async (holdingId: string): Promise<InvestmentTransaction[]> => {
    const db = await initDatabase();
    const result = await db.getAllAsync<any>(
        'SELECT * FROM investment_transactions WHERE holding_id = ? AND is_deleted = 0 ORDER BY event_date DESC',
        holdingId
    );
    return result.map(row => ({
        ...row,
        units: row.units !== null ? row.units : undefined,
        nav: row.nav !== null ? row.nav : undefined,
        price: row.price !== null ? row.price : undefined,
        quantity: row.quantity !== null ? row.quantity : undefined,
        balance_after: row.balance_after !== null ? row.balance_after : undefined,
        notes: row.notes !== null ? row.notes : undefined,
        sms_id: row.sms_id !== null ? row.sms_id : undefined,
        is_deleted: row.is_deleted === 1,
    }));
};

export const deleteInvestmentTxFromDB = async (id: string): Promise<void> => {
    const db = await initDatabase();
    await db.runAsync('UPDATE investment_transactions SET is_deleted = 1 WHERE id = ?', id);
};

export const fetchAllInvestmentTxsFromDB = async (): Promise<InvestmentTransaction[]> => {
    const db = await initDatabase();
    const result = await db.getAllAsync<any>(
        'SELECT * FROM investment_transactions ORDER BY event_date DESC'
    );
    return result.map(row => ({
        ...row,
        units: row.units !== null ? row.units : undefined,
        nav: row.nav !== null ? row.nav : undefined,
        price: row.price !== null ? row.price : undefined,
        quantity: row.quantity !== null ? row.quantity : undefined,
        balance_after: row.balance_after !== null ? row.balance_after : undefined,
        notes: row.notes !== null ? row.notes : undefined,
        sms_id: row.sms_id !== null ? row.sms_id : undefined,
        is_deleted: row.is_deleted === 1,
    }));
};

/**
 * Deduplication check — returns the existing transaction if an SMS with
 * the given sms_id was already processed. Returns null if this is new.
 */
export const findInvestmentTxBySmsId = async (smsId: string): Promise<InvestmentTransaction | null> => {
    const db = await initDatabase();
    const result = await db.getFirstAsync<any>(
        'SELECT * FROM investment_transactions WHERE sms_id = ? AND is_deleted = 0 LIMIT 1',
        smsId
    );
    if (!result) return null;
    return {
        ...result,
        units: result.units !== null ? result.units : undefined,
        nav: result.nav !== null ? result.nav : undefined,
        price: result.price !== null ? result.price : undefined,
        quantity: result.quantity !== null ? result.quantity : undefined,
        balance_after: result.balance_after !== null ? result.balance_after : undefined,
        notes: result.notes !== null ? result.notes : undefined,
        sms_id: result.sms_id !== null ? result.sms_id : undefined,
        is_deleted: result.is_deleted === 1,
    };
};

