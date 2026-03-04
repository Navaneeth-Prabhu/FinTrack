/**
 * sync.ts — Supabase Sync Service
 *
 * Push-first sync:
 *   1. Get authenticated user from Supabase Auth (bails out if not signed in)
 *   2. Sync categories first (using local_id as stable dedup key)
 *   3. Sync transactions with proper category_id FK references
 *   4. Log sync to sync_log table
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

// expo-crypto-based UUID generator — replaces the missing react-native-get-random-values + uuid
function uuidv4(): string {
    return Crypto.randomUUID();
}
import { supabase } from './supabaseClient';
import { fetchTransactionsFromDB } from '@/db/repository/transactionRepository';
import { fetchSIPsFromDB } from '@/db/repository/sipRepository';
import { fetchHoldingsFromDB } from '@/db/repository/holdingsRepository';
import { fetchLoansFromDB } from '@/db/repository/loanRepository';
import { fetchAllInvestmentTxsFromDB } from '@/db/repository/investmentTxRepository';
import { fetchAllPriceSnapshotsFromDB } from '@/db/repository/priceSnapshotRepository';
import { initDatabase } from '@/db/services/sqliteService';
import { Transaction, Category } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const LAST_SYNC_KEY = '@fintrack_last_sync_time';
const DEVICE_ID_KEY = '@fintrack_device_id';

/**
 * Get or create a stable device UUID stored in AsyncStorage.
 * Used to identify which device a synced row was written from.
 */
export const getDeviceId = async (): Promise<string> => {
    let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
        id = uuidv4();
        await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
};

/**
 * Get the current authenticated user's ID from Supabase Auth.
 * Returns null if the user is not signed in.
 */
export const getAuthUserId = async (): Promise<string | null> => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        console.warn('[Sync] No authenticated user — skipping sync:', error?.message);
        return null;
    }
    return user.id;
};

/** @deprecated Use getAuthUserId() instead */
export const PLACEHOLDER_USER_ID = '00000000-0000-0000-0000-000000000001';

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
            updated_at: tx.lastModified || new Date().toISOString(),
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

// ─── Batch Upsert Helper ───────────────────────────────────────────────────────
const batchUpsertToSupabase = async (table: string, rows: any[], conflictKey: string = 'id'): Promise<TransactionSyncResult> => {
    const CHUNK_SIZE = 200;
    let totalSynced = 0;
    let totalFailed = 0;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase
            .from(table)
            .upsert(chunk, {
                onConflict: conflictKey,
                ignoreDuplicates: false,
            });

        if (error) {
            console.error(`[Sync] ${table} upsert error (chunk ${i}):`, error.message);
            totalFailed += chunk.length;
        } else {
            totalSynced += chunk.length;
        }
    }

    console.log(`[Sync] ${table} synced: ${totalSynced}, failed: ${totalFailed}`);
    return { synced: totalSynced, failed: totalFailed };
};

// ─── Investment Syncs ─────────────────────────────────────────────────────────

export const syncSIPsToSupabase = async (
    userId: string,
    categoryIdMap: Record<string, string>
): Promise<TransactionSyncResult> => {
    const sips = await fetchSIPsFromDB();
    if (sips.length === 0) return { synced: 0, failed: 0 };

    const rows = sips.map(sip => ({
        user_id: userId,
        id: sip.id,
        name: sip.name,
        fund_name: sip.fundName,
        amount: sip.amount,
        frequency: sip.frequency,
        start_date: sip.startDate,
        next_due_date: sip.nextDueDate,
        sip_day: sip.sipDay,
        total_invested: sip.totalInvested,
        units: sip.units ?? null,
        nav: sip.nav ?? null,
        status: sip.status,
        notes: sip.notes ?? null,
        category_id: sip.categoryId ? (categoryIdMap[sip.categoryId] ?? null) : null,
        created_at: sip.createdAt,
        last_modified: sip.lastModified,
        price_updated_at: sip.priceUpdatedAt ?? null,
        current_value: sip.currentValue ?? 0,
        scheme_code: sip.schemeCode ?? null,
        is_deleted: sip.isDeleted ?? false
    }));

    return batchUpsertToSupabase('sips', rows, 'id');
};

export const syncHoldingsToSupabase = async (userId: string): Promise<TransactionSyncResult> => {
    const holdings = await fetchHoldingsFromDB();
    if (holdings.length === 0) return { synced: 0, failed: 0 };

    const rows = holdings.map(h => ({
        user_id: userId,
        id: h.id,
        type: h.type,
        name: h.name,
        ticker: h.ticker ?? null,
        quantity: h.quantity,
        avg_buy_price: h.avg_buy_price,
        current_price: h.current_price,
        buy_date: h.buy_date,
        notes: h.notes ?? null,
        price_updated_at: h.price_updated_at ?? null,
        is_deleted: h.is_deleted ?? false,
        updated_at: h.updated_at,
        folio_number: h.folio_number ?? null,
        account_number: h.account_number ?? null,
        invested_amount: h.invested_amount ?? null,
        current_value: h.current_value ?? null,
        metadata: h.metadata ?? null,
        source: h.source ?? 'manual'
    }));

    return batchUpsertToSupabase('holdings', rows, 'id');
};

export const syncLoansToSupabase = async (userId: string): Promise<TransactionSyncResult> => {
    const loans = await fetchLoansFromDB();
    if (loans.length === 0) return { synced: 0, failed: 0 };

    const rows = loans.map(l => ({
        user_id: userId,
        id: l.id,
        lender: l.lender,
        loan_type: l.loanType,
        principal: l.principal,
        outstanding: l.outstanding,
        emi_amount: l.emiAmount,
        emi_due_day: l.emiDueDay,
        tenure_months: l.tenureMonths,
        start_date: l.startDate,
        status: l.status,
        source: l.source,
        notes: l.notes ?? null,
        created_at: l.createdAt,
        last_modified: l.lastModified
    }));
    return batchUpsertToSupabase('loans', rows, 'id');
};

export const syncInvestmentTxsToSupabase = async (userId: string): Promise<TransactionSyncResult> => {
    const txs = await fetchAllInvestmentTxsFromDB();
    if (txs.length === 0) return { synced: 0, failed: 0 };

    const rows = txs.map(tx => ({
        user_id: userId,
        id: tx.id,
        holding_id: tx.holding_id,
        holding_type: tx.holding_type,
        event_type: tx.event_type,
        amount: tx.amount,
        units: tx.units ?? null,
        nav: tx.nav ?? null,
        price: tx.price ?? null,
        quantity: tx.quantity ?? null,
        balance_after: tx.balance_after ?? null,
        notes: tx.notes ?? null,
        event_date: tx.event_date,
        source: tx.source ?? 'manual',
        sms_id: tx.sms_id ?? null,
        is_deleted: tx.is_deleted ?? false,
        updated_at: tx.updated_at,
        created_at: tx.created_at
    }));
    return batchUpsertToSupabase('investment_transactions', rows, 'id');
};

export const syncPriceSnapshotsToSupabase = async (): Promise<TransactionSyncResult> => {
    const snaps = await fetchAllPriceSnapshotsFromDB();
    if (snaps.length === 0) return { synced: 0, failed: 0 };

    const rows = snaps.map(s => ({
        id: s.id,
        holding_id: s.holding_id,
        price: s.price,
        recorded_at: s.recorded_at,
        source: s.source ?? 'manual',
        created_at: s.created_at
    }));
    return batchUpsertToSupabase('price_snapshots', rows, 'id');
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
 *   1. Get authenticated user (bail if not signed in)
 *   2. Sync categories → get ID map
 *   3. Sync transactions with resolved category FKs
 *   4. Log to sync_log
 *   5. Persist lastSyncTime in AsyncStorage
 */
export const syncAll = async (): Promise<SyncResult> => {
    const syncedAt = new Date().toISOString();

    // ── Auth check (replaces PLACEHOLDER_USER_ID) ──
    const userId = await getAuthUserId();
    if (!userId) {
        return {
            success: false,
            categoriesSynced: 0,
            transactionsSynced: 0,
            failed: 0,
            syncedAt,
            error: 'Not signed in — sync requires authentication',
        };
    }

    const deviceId = await getDeviceId();

    try {
        // Step 1: Sync categories first
        const catResult = await syncCategoriesToSupabase(userId);

        // Step 2: Sync transactions using category ID map
        const txResult = await syncTransactionsToSupabase(userId, catResult.idMap);

        // Step 3: Sync new investment tables
        const sipResult = await syncSIPsToSupabase(userId, catResult.idMap);
        const holdingsResult = await syncHoldingsToSupabase(userId);
        const loansResult = await syncLoansToSupabase(userId);
        const invTxResult = await syncInvestmentTxsToSupabase(userId);
        const snapsResult = await syncPriceSnapshotsToSupabase();

        const totalInvSynced = sipResult.synced + holdingsResult.synced + loansResult.synced + invTxResult.synced + snapsResult.synced;
        const totalInvFailed = sipResult.failed + holdingsResult.failed + loansResult.failed + invTxResult.failed + snapsResult.failed;

        // Step 4: Log the sync event
        await supabase.from('sync_log').insert({
            user_id: userId,
            device_id: deviceId,
            synced_at: syncedAt,
            categories_synced: catResult.synced,
            transactions_synced: txResult.synced + totalInvSynced,
            status: (txResult.failed + totalInvFailed) === 0 ? 'success' : 'partial',
        });

        // Step 4: Persist timestamp
        await AsyncStorage.setItem(LAST_SYNC_KEY, syncedAt);

        return {
            success: true,
            categoriesSynced: catResult.synced,
            transactionsSynced: txResult.synced + totalInvSynced,
            failed: catResult.failed + txResult.failed + totalInvFailed,
            syncedAt,
        };
    } catch (err: any) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown sync error';
        console.error('[Sync] Fatal error:', errorMsg);

        // Still try to log the failure
        try {
            await supabase.from('sync_log').insert({
                user_id: userId,
                device_id: deviceId,
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
