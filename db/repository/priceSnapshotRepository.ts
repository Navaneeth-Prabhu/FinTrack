import { PriceSnapshot } from '@/types';
import { initDatabase } from '../services/sqliteService';

export const savePriceSnapshotToDB = async (snapshot: PriceSnapshot): Promise<void> => {
    const db = await initDatabase();
    await db.runAsync(
        `INSERT INTO price_snapshots (
            id, holding_id, price, recorded_at, source, created_at
        ) VALUES(?, ?, ?, ?, ?, ?)`,
        snapshot.id,
        snapshot.holding_id,
        snapshot.price,
        snapshot.recorded_at,
        snapshot.source ?? 'manual',
        snapshot.created_at
    );
};

export const fetchPriceSnapshotsByHoldingIdFromDB = async (holdingId: string): Promise<PriceSnapshot[]> => {
    const db = await initDatabase();
    const result = await db.getAllAsync<any>(
        'SELECT * FROM price_snapshots WHERE holding_id = ? ORDER BY recorded_at ASC',
        holdingId
    );
    return result.map(row => ({
        ...row,
        source: row.source !== null ? row.source : undefined,
    }));
};

export const fetchAllPriceSnapshotsFromDB = async (): Promise<PriceSnapshot[]> => {
    const db = await initDatabase();
    const result = await db.getAllAsync<any>(
        'SELECT * FROM price_snapshots ORDER BY recorded_at ASC'
    );
    return result.map(row => ({
        ...row,
        source: row.source !== null ? row.source : undefined,
    }));
};
