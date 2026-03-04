import * as SQLite from 'expo-sqlite';
import { SIPPlan } from '@/types';
import { initDatabase } from '../services/sqliteService';

export const saveSIPToDB = async (sip: SIPPlan): Promise<void> => {
    const db = await initDatabase();
    await db.runAsync(
        `INSERT INTO sip_plans (
        id, name, fundName, amount, frequency, startDate, nextDueDate,
        sipDay, totalInvested, units, nav, status, notes, categoryId,
        createdAt, lastModified, priceUpdatedAt, currentValue, schemeCode, isDeleted
    ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        sip.id,
        sip.name,
        sip.fundName,
        sip.amount,
        sip.frequency,
        sip.startDate,
        sip.nextDueDate,
        sip.sipDay,
        sip.totalInvested,
        sip.units ?? null,
        sip.nav ?? null,
        sip.status,
        sip.notes ?? null,
        sip.categoryId,
        sip.createdAt,
        sip.lastModified,
        sip.priceUpdatedAt ?? null,
        sip.currentValue ?? 0,
        sip.schemeCode ?? null,
        sip.isDeleted ? 1 : 0
    );
};

export const fetchSIPsFromDB = async (): Promise<SIPPlan[]> => {
    const db = await initDatabase();
    const result = await db.getAllAsync<any>(
        'SELECT * FROM sip_plans WHERE isDeleted = 0 OR isDeleted IS NULL ORDER BY createdAt DESC'
    );

    return result.map(row => ({
        ...row,
        units: row.units !== null ? row.units : undefined,
        nav: row.nav !== null ? row.nav : undefined,
        notes: row.notes !== null ? row.notes : undefined,
        priceUpdatedAt: row.priceUpdatedAt !== null ? row.priceUpdatedAt : undefined,
        currentValue: row.currentValue !== null ? row.currentValue : undefined,
        schemeCode: row.schemeCode !== null ? row.schemeCode : undefined,
        isDeleted: row.isDeleted === 1,
    }));
};

export const updateSIPInDB = async (sip: SIPPlan): Promise<SIPPlan> => {
    const db = await initDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
        `UPDATE sip_plans SET
        name = ?, fundName = ?, amount = ?, frequency = ?, startDate = ?,
        nextDueDate = ?, sipDay = ?, totalInvested = ?, units = ?, nav = ?,
        status = ?, notes = ?, categoryId = ?, lastModified = ?, priceUpdatedAt = ?,
        currentValue = ?, schemeCode = ?, isDeleted = ?
        WHERE id = ?`,
        sip.name,
        sip.fundName,
        sip.amount,
        sip.frequency,
        sip.startDate,
        sip.nextDueDate,
        sip.sipDay,
        sip.totalInvested,
        sip.units ?? null,
        sip.nav ?? null,
        sip.status,
        sip.notes ?? null,
        sip.categoryId,
        now,
        sip.priceUpdatedAt ?? null,
        sip.currentValue ?? 0,
        sip.schemeCode ?? null,
        sip.isDeleted ? 1 : 0,
        sip.id
    );
    return { ...sip, lastModified: now };
};

export const deleteSIPFromDB = async (id: string): Promise<void> => {
    const db = await initDatabase();
    await db.runAsync('DELETE FROM sip_plans WHERE id = ?', id);
};
