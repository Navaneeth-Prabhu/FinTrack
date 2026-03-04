import * as SQLite from 'expo-sqlite';
import { Holding } from '@/types';
import { initDatabase } from '../services/sqliteService';

export const saveHoldingToDB = async (holding: Holding): Promise<void> => {
    const db = await initDatabase();
    await db.runAsync(
        `INSERT INTO holdings (
        id, user_id, type, name, ticker, quantity, avg_buy_price, current_price,
        buy_date, notes, price_updated_at, is_deleted, updated_at, folio_number,
        account_number, invested_amount, current_value, metadata, source
    ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        holding.id,
        holding.user_id ?? null,
        holding.type,
        holding.name,
        holding.ticker ?? null,
        holding.quantity,
        holding.avg_buy_price,
        holding.current_price,
        holding.buy_date,
        holding.notes ?? null,
        holding.price_updated_at ?? null,
        holding.is_deleted ? 1 : 0,
        holding.updated_at,
        holding.folio_number ?? null,
        holding.account_number ?? null,
        holding.invested_amount ?? null,
        holding.current_value ?? null,
        holding.metadata ?? null,
        holding.source ?? 'manual'
    );
};

export const fetchHoldingsFromDB = async (): Promise<Holding[]> => {
    const db = await initDatabase();
    const result = await db.getAllAsync<any>(
        'SELECT * FROM holdings WHERE is_deleted = 0 ORDER BY updated_at DESC'
    );

    return result.map(row => ({
        ...row,
        user_id: row.user_id !== null ? row.user_id : undefined,
        ticker: row.ticker !== null ? row.ticker : undefined,
        notes: row.notes !== null ? row.notes : undefined,
        price_updated_at: row.price_updated_at !== null ? row.price_updated_at : undefined,
        folio_number: row.folio_number !== null ? row.folio_number : undefined,
        account_number: row.account_number !== null ? row.account_number : undefined,
        invested_amount: row.invested_amount !== null ? row.invested_amount : undefined,
        current_value: row.current_value !== null ? row.current_value : undefined,
        metadata: row.metadata !== null ? row.metadata : undefined,
        source: row.source !== null ? row.source : undefined,
        is_deleted: row.is_deleted === 1,
    }));
};

export const updateHoldingInDB = async (holding: Holding): Promise<Holding> => {
    const db = await initDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
        `UPDATE holdings SET
        user_id = ?, type = ?, name = ?, ticker = ?, quantity = ?, avg_buy_price = ?,
        current_price = ?, buy_date = ?, notes = ?, price_updated_at = ?,
        is_deleted = ?, updated_at = ?, folio_number = ?, account_number = ?,
        invested_amount = ?, current_value = ?, metadata = ?, source = ?
        WHERE id = ?`,
        holding.user_id ?? null,
        holding.type,
        holding.name,
        holding.ticker ?? null,
        holding.quantity,
        holding.avg_buy_price,
        holding.current_price,
        holding.buy_date,
        holding.notes ?? null,
        holding.price_updated_at ?? null,
        holding.is_deleted ? 1 : 0,
        now,
        holding.folio_number ?? null,
        holding.account_number ?? null,
        holding.invested_amount ?? null,
        holding.current_value ?? null,
        holding.metadata ?? null,
        holding.source ?? 'manual',
        holding.id
    );
    return { ...holding, updated_at: now };
};

export const deleteHoldingFromDB = async (id: string): Promise<void> => {
    const db = await initDatabase();
    const now = new Date().toISOString();
    // Soft delete
    await db.runAsync(
        'UPDATE holdings SET is_deleted = 1, updated_at = ? WHERE id = ?',
        now,
        id
    );
};
