import { create } from 'zustand';
import { syncAll, getLastSyncTime, SyncResult } from '@/services/sync';

interface SyncStats {
    categoriesSynced: number;
    transactionsSynced: number;
    failed: number;
}

interface SyncState {
    isSyncing: boolean;
    lastSyncTime: string | null;
    lastSyncStats: SyncStats | null;
    lastSyncError: string | null;

    loadLastSyncTime: () => Promise<void>;
    triggerSync: () => Promise<SyncResult>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
    isSyncing: false,
    lastSyncTime: null,
    lastSyncStats: null,
    lastSyncError: null,

    loadLastSyncTime: async () => {
        const time = await getLastSyncTime();
        set({ lastSyncTime: time });
    },

    triggerSync: async () => {
        if (get().isSyncing) {
            return {
                success: false,
                categoriesSynced: 0,
                transactionsSynced: 0,
                failed: 0,
                syncedAt: new Date().toISOString(),
                error: 'Sync already in progress',
            };
        }

        set({ isSyncing: true, lastSyncError: null });

        try {
            const result = await syncAll();

            set({
                isSyncing: false,
                lastSyncTime: result.syncedAt,
                lastSyncStats: {
                    categoriesSynced: result.categoriesSynced,
                    transactionsSynced: result.transactionsSynced,
                    failed: result.failed,
                },
                lastSyncError: result.error ?? null,
            });

            return result;
        } catch (err: any) {
            const msg = err instanceof Error ? err.message : 'Sync failed';
            set({ isSyncing: false, lastSyncError: msg });
            return {
                success: false,
                categoriesSynced: 0,
                transactionsSynced: 0,
                failed: 0,
                syncedAt: new Date().toISOString(),
                error: msg,
            };
        }
    },
}));
