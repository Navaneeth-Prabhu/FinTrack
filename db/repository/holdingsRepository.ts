import * as SQLite from 'expo-sqlite';
import { Holding } from '@/types';
import { initDatabase } from '../services/sqliteService';

export const saveHoldingToDB = async (holding: Holding): Promise<void> => {
    const db = await initDatabase();
    await db.runAsync(
        `INSERT INTO holdings (
        id, user_id, type, name, ticker, quantity, avg_buy_price, current_price,
        buy_date, notes, price_updated_at, is_deleted, updated_at
    ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        holding.is_deleted ?? 0,
        holding.updated_at
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
    }));
};

export const updateHoldingInDB = async (holding: Holding): Promise<Holding> => {
    const db = await initDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
        `UPDATE holdings SET
        user_id = ?, type = ?, name = ?, ticker = ?, quantity = ?, avg_buy_price = ?,
        current_price = ?, buy_date = ?, notes = ?, price_updated_at = ?,
        is_deleted = ?, updated_at = ?
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
        holding.is_deleted ?? 0,
        now,
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
