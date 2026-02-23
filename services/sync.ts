/**
 * sync.ts — Supabase Manual Backup Sync Service
 *
 * Industry-standard approach:
 *   1. Sync categories first (using local_id as stable dedup key)
 *   2. Sync transactions with proper category_id FK references
 *   3. Log sync to sync_log table
 *
 * No auth yet: uses PLACEHOLDER_USER_ID. Swap for real UUID when auth is added.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import { fetchTransactionsFromDB } from '@/db/repository/transactionRepository';
import { initDatabase } from '@/db/services/sqliteService';
import { Transaction, Category } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Fixed placeholder UUID used until Supabase Auth is integrated.
 * Replace with `supabase.auth.getUser()` once auth is wired up.
 */
export const PLACEHOLDER_USER_ID = '00000000-0000-0000-0000-000000000001';

const LAST_SYNC_KEY = '@fintrack_last_sync_time';

// ─── Type Mappings ────────────────────────────────────────────────────────────

/** Map local transaction type (lowercase) → Supabase ENUM (uppercase) */
const mapTransactionType = (type: string): string => {
    const typeMap: Record<string, string> = {
        income: 'INCOME',
        expense: 'EXPENSE',
        transfer: 'TRANSFER',
        investment: 'INVESTMENT',
        uncategorized: 'UNCATEGORIZED',
    };
    return typeMap[type?.toLowerCase()] ?? 'UNCATEGORIZED';
};

/** Map local category type (lowercase) → Supabase ENUM (uppercase) */
const mapCategoryType = (type: string): string => {
    const typeMap: Record<string, string> = {
        income: 'INCOME',
        expense: 'EXPENSE',
        transfer: 'TRANSFER',
        investment: 'INVESTMENT',
        uncategorized: 'UNCATEGORIZED',
    };
    return typeMap[type?.toLowerCase()] ?? 'UNCATEGORIZED';
};

/**
 * Map local mode/method values to Supabase's allowed method constraint.
 * Supabase allows: 'UPI', 'Debit Card', 'Credit Card', 'Card', 'Cash',
 *   'Bank Transfer', 'Net Banking', 'Wallet', 'SIP', 'Check', 'Other', 'Unknown'
 */
const mapPaymentMethod = (mode: string): string => {
    const allowed = [
        'UPI', 'Debit Card', 'Credit Card', 'Card', 'Cash',
        'Bank Transfer', 'Net Banking', 'Wallet', 'SIP', 'Check', 'Other', 'Unknown',
    ];
    if (allowed.includes(mode)) return mode;
    // Common aliases from SMS parsing
    const aliases: Record<string, string> = {
        'debit': 'Debit Card',
        'credit': 'Credit Card',
        'neft': 'Bank Transfer',
        'imps': 'Bank Transfer',
        'rtgs': 'Bank Transfer',
        'net banking': 'Net Banking',
        'netbanking': 'Net Banking',
        'paytm': 'Wallet',
        'phonepe': 'UPI',
        'gpay': 'UPI',
        'google pay': 'UPI',
        'bhim': 'UPI',
    };
    return aliases[mode?.toLowerCase()] ?? 'Other';
};

// ─── Category Sync ─────────────────────────────────────────────────────────────

export interface CategorySyncResult {
    /** Maps local category ID → Supabase UUID */
    idMap: Record<string, string>;
    synced: number;
    failed: number;
}

/**
 * Syncs all local categories to Supabase.
 * Uses `local_id` column for idempotent upsert.
 * Returns a mapping from localCategoryId → supabaseCategoryId.
 */
export const syncCategoriesToSupabase = async (
    userId: string
): Promise<CategorySyncResult> => {
    const db = await initDatabase();
    const rows = await db.getAllAsync(`
    SELECT id, name, icon, type, color FROM categories
  `) as Array<{ id: string; name: string; icon: string; type: string; color: string }>;

    if (rows.length === 0) return { idMap: {}, synced: 0, failed: 0 };

    const categoriesToUpsert = rows.map(cat => ({
        user_id: userId,
        local_id: cat.id,        // stable dedup key
        name: cat.name,
        type: mapCategoryType(cat.type),
        icon: cat.icon || '📦',
        color: cat.color || '#8F85FF',
        is_default: false,
        is_system: false,
    }));

    // Upsert using local_id as the conflict key (UNIQUE CONSTRAINT on local_id)
    const { data, error } = await supabase
        .from('categories')
        .upsert(categoriesToUpsert, {
            onConflict: 'local_id',
            ignoreDuplicates: false,
        })
        .select('id, local_id');

    if (error) {
        console.error('[Sync] Category upsert error:', error.message);
        return { idMap: {}, synced: 0, failed: rows.length };
    }

    // Build localId → supabaseId map from returned rows
    const idMap: Record<string, string> = {};
    (data ?? []).forEach((row: { id: string; local_id: string }) => {
        if (row.local_id) {
            idMap[row.local_id] = row.id;
        }
    });

    // Also fetch existing synced categories to cover rows that were ignored
    const { data: existing } = await supabase
        .from('categories')
        .select('id, local_id')
        .eq('user_id', userId)
        .not('local_id', 'is', null);

    (existing ?? []).forEach((row: { id: string; local_id: string }) => {
        if (row.local_id && !idMap[row.local_id]) {
            idMap[row.local_id] = row.id;
        }
    });

    const synced = Object.keys(idMap).length;
    console.log(`[Sync] Categories synced: ${synced}/${rows.length}`);
    return { idMap, synced, failed: rows.length - synced };
};

// ─── Transaction Sync ──────────────────────────────────────────────────────────

export interface TransactionSyncResult {
    synced: number;
    failed: number;
}

/**
 * Syncs all local transactions to Supabase.
 * Resolves category_id via the category ID map produced by syncCategoriesToSupabase.
 * Uses `dedupe_key` = local transaction id for conflict resolution.
 */
export const syncTransactionsToSupabase = async (
    userId: string,
    categoryIdMap: Record<string, string>
): Promise<TransactionSyncResult> => {
    const transactions = await fetchTransactionsFromDB();

    if (transactions.length === 0) return { synced: 0, failed: 0 };

    const rows = transactions.map((tx: Transaction) => {
        const supabaseCategoryId = tx.category?.id
            ? (categoryIdMap[tx.category.id] ?? null)
            : null;

        return {
            user_id: userId,
            dedupe_key: tx.id,                          // idempotent upsert key
            date: tx.date,
            amount: tx.amount,
            type: mapTransactionType(tx.type),
            description: tx.note ?? null,
            source: tx.source?.type ?? 'manual',
            method: mapPaymentMethod(tx.mode ?? 'Other'),
            to_from: tx.paidTo ?? null,                 // payee for expense/transfer
            sender: tx.paidBy ?? null,                  // payer for income
            category_id: supabaseCategoryId,
            note: tx.note ?? null,
            local_recurring_id: tx.recurringId ?? null,
            currency: 'INR',
            merchant: tx.paidTo ?? tx.paidBy ?? null,
            ref_number: tx.refNumber ?? null,
        };
    });

    // Batch upsert in chunks of 200 to avoid payload limits
    const CHUNK_SIZE = 200;
    let totalSynced = 0;
    let totalFailed = 0;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase
            .from('transactions')
            .upsert(chunk, {
                onConflict: 'dedupe_key',
                ignoreDuplicates: false,
            });

        if (error) {
            console.error(`[Sync] Transaction upsert error (chunk ${i}):`, error.message);
            totalFailed += chunk.length;
        } else {
            totalSynced += chunk.length;
        }
    }

    console.log(`[Sync] Transactions synced: ${totalSynced}, failed: ${totalFailed}`);
    return { synced: totalSynced, failed: totalFailed };
};

// ─── Main Orchestrator ─────────────────────────────────────────────────────────

export interface SyncResult {
    success: boolean;
    categoriesSynced: number;
    transactionsSynced: number;
    failed: number;
    syncedAt: string;
    error?: string;
}

/**
 * Full sync orchestration:
 *   1. Sync categories → get ID map
 *   2. Sync transactions with resolved category FKs
 *   3. Log to sync_log
 *   4. Persist lastSyncTime in AsyncStorage
 */
export const syncAll = async (): Promise<SyncResult> => {
    const userId = PLACEHOLDER_USER_ID;
    const syncedAt = new Date().toISOString();

    try {
        // Step 1: Sync categories first
        const catResult = await syncCategoriesToSupabase(userId);

        // Step 2: Sync transactions using category ID map
        const txResult = await syncTransactionsToSupabase(userId, catResult.idMap);

        // Step 3: Log the sync event
        await supabase.from('sync_log').insert({
            user_id: userId,
            device_id: 'mobile',
            synced_at: syncedAt,
            categories_synced: catResult.synced,
            transactions_synced: txResult.synced,
            status: txResult.failed === 0 ? 'success' : 'partial',
        });

        // Step 4: Persist timestamp
        await AsyncStorage.setItem(LAST_SYNC_KEY, syncedAt);

        return {
            success: true,
            categoriesSynced: catResult.synced,
            transactionsSynced: txResult.synced,
            failed: catResult.failed + txResult.failed,
            syncedAt,
        };
    } catch (err: any) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown sync error';
        console.error('[Sync] Fatal error:', errorMsg);

        // Still try to log the failure
        try {
            await supabase.from('sync_log').insert({
                user_id: userId,
                device_id: 'mobile',
                synced_at: syncedAt,
                categories_synced: 0,
                transactions_synced: 0,
                status: 'failed',
                error_message: errorMsg,
            });
        } catch (_) { }

        return {
            success: false,
            categoriesSynced: 0,
            transactionsSynced: 0,
            failed: 0,
            syncedAt,
            error: errorMsg,
        };
    }
};

// ─── AsyncStorage Helpers ──────────────────────────────────────────────────────

export const getLastSyncTime = async (): Promise<string | null> => {
    return await AsyncStorage.getItem(LAST_SYNC_KEY);
};

export const setLastSyncTime = async (isoString: string): Promise<void> => {
    await AsyncStorage.setItem(LAST_SYNC_KEY, isoString);
};
