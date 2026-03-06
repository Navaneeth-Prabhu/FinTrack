import * as SQLite from 'expo-sqlite';
import { SIPPlan } from '@/types';
import { initDatabase } from '../services/sqliteService';

export const saveSIPToDB = async (sip: SIPPlan): Promise<void> => {
    const db = await initDatabase();
    await db.runAsync(
        `INSERT INTO sip_plans (
        id, name, fundName, amount, frequency, startDate, nextDueDate,
        sipDay, totalInvested, units, nav, status, notes, categoryId,
        createdAt, lastModified, priceUpdatedAt, currentValue, schemeCode, folioNumber, isDeleted
    ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        sip.folioNumber ?? null,
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
        folioNumber: row.folioNumber !== null ? row.folioNumber : undefined,
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
        currentValue = ?, schemeCode = ?, folioNumber = ?, isDeleted = ?
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
        sip.folioNumber ?? null,
        sip.isDeleted ? 1 : 0,
        sip.id
    );
    return { ...sip, lastModified: now };
};

export const deleteSIPFromDB = async (id: string): Promise<void> => {
    const db = await initDatabase();
    await db.runAsync('DELETE FROM sip_plans WHERE id = ?', id);
};

/**
 * Find a SIP by its folio number — used by investmentSmsHandler to match
 * an auto-parsed allotment SMS to an existing SIP.
 */
export const findSIPByFolio = async (folioNumber: string): Promise<SIPPlan | null> => {
    const db = await initDatabase();
    const result = await db.getFirstAsync<any>(
        'SELECT * FROM sip_plans WHERE folioNumber = ? AND (isDeleted = 0 OR isDeleted IS NULL) LIMIT 1',
        folioNumber
    );
    if (!result) return null;
    return {
        ...result,
        units: result.units !== null ? result.units : undefined,
        nav: result.nav !== null ? result.nav : undefined,
        notes: result.notes !== null ? result.notes : undefined,
        priceUpdatedAt: result.priceUpdatedAt !== null ? result.priceUpdatedAt : undefined,
        currentValue: result.currentValue !== null ? result.currentValue : undefined,
        schemeCode: result.schemeCode !== null ? result.schemeCode : undefined,
        folioNumber: result.folioNumber !== null ? result.folioNumber : undefined,
        isDeleted: result.isDeleted === 1,
    };
};

/**
 * Auto-create a skeleton SIP from an SMS allotment when no matching folio exists.
 * The user fills in fund name, start date, etc. later from the SIP detail screen.
 */
export const createSIPFromSMS = async (params: {
    folioNumber: string;
    amount: number;
    fundName?: string;
}): Promise<string> => {
    const db = await initDatabase();
    const now = new Date().toISOString();
    const id = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

    await db.runAsync(
        `INSERT INTO sip_plans (
            id, name, fundName, amount, frequency, startDate, nextDueDate,
            sipDay, totalInvested, units, nav, status, notes, categoryId,
            createdAt, lastModified, priceUpdatedAt, currentValue, schemeCode, folioNumber, isDeleted
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        params.fundName ?? `Folio ${params.folioNumber}`,  // placeholder name
        params.fundName ?? '',
        params.amount,
        'monthly',
        now,
        now,
        1,   // sipDay placeholder
        0,   // totalInvested — will grow as allotments are recorded
        null,
        null,
        'active',
        `Auto-created from SMS. Folio: ${params.folioNumber}`,
        'investments',
        now,
        now,
        null,
        0,
        null,
        params.folioNumber,  // ← now properly stored
        0
    );

    return id;
};
