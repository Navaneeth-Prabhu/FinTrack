// db/repository/alertRepository.ts
// CRUD operations for the sms_alerts table.

import { initDatabase } from '@/db/services/sqliteService';
import { SMSAlert } from '@/types';
import * as Crypto from 'expo-crypto';

async function getDb() {
    return initDatabase();
}

// ─── Map DB row → SMSAlert ────────────────────────────────────────────────────
function rowToAlert(row: any): SMSAlert {
    return {
        id: row.id,
        type: row.type,
        title: row.title,
        body: row.body,
        amount: row.amount ?? undefined,
        bank: row.bank ?? undefined,
        accountLast4: row.accountLast4 ?? undefined,
        smsId: row.smsId ?? undefined,
        isRead: row.isRead === 1,
        createdAt: row.createdAt,
    };
}

export const fetchAlertsFromDB = async (limit = 100): Promise<SMSAlert[]> => {
    const db = await getDb();
    const rows = await db.getAllAsync<any>(
        `SELECT * FROM sms_alerts ORDER BY createdAt DESC LIMIT ?`,
        [limit],
    );
    return rows.map(rowToAlert);
};

export const insertAlertToDB = async (alert: Omit<SMSAlert, 'id' | 'createdAt' | 'isRead'>): Promise<SMSAlert> => {
    const db = await getDb();
    const id = Crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await db.runAsync(
        `INSERT INTO sms_alerts (id, type, title, body, amount, bank, accountLast4, smsId, isRead, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [
            id,
            alert.type,
            alert.title,
            alert.body,
            alert.amount ?? null,
            alert.bank ?? null,
            alert.accountLast4 ?? null,
            alert.smsId ?? null,
            createdAt,
        ],
    );

    return { ...alert, id, isRead: false, createdAt };
};

export const markAlertReadInDB = async (id: string): Promise<void> => {
    const db = await getDb();
    await db.runAsync(`UPDATE sms_alerts SET isRead = 1 WHERE id = ?`, [id]);
};

export const markAllAlertsReadInDB = async (): Promise<void> => {
    const db = await getDb();
    await db.runAsync(`UPDATE sms_alerts SET isRead = 1`);
};

export const deleteAlertFromDB = async (id: string): Promise<void> => {
    const db = await getDb();
    await db.runAsync(`DELETE FROM sms_alerts WHERE id = ?`, [id]);
};

export const smsAlertExistsBySmSId = async (smsId: string): Promise<boolean> => {
    const db = await getDb();
    const row = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM sms_alerts WHERE smsId = ?`,
        [smsId],
    );
    return (row?.count ?? 0) > 0;
};
