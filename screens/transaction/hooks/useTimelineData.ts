import { useState, useEffect, useCallback } from 'react';
import { Transaction } from '@/types';
import { fetchTimelineTransactionsFromDB, fetchMonthlyTotalsFromDB } from '@/db/repository/transactionRepository';
import { useTransactionStore } from '@/stores/transactionStore';
import { isSameMonth, subMonths, addMonths, startOfMonth, endOfMonth } from 'date-fns';

interface TimelineFilters {
    transactionType: string[];
    categories: string[];
}

interface DateRange {
    start: string;
    end: string;
}

interface CacheState {
    transactions: Record<string, Transaction[]>;
    totals: Record<string, { income: number, expense: number } | null>;
}

// Module-level cache to persist across component unmounts
let globalCache: CacheState = {
    transactions: {},
    totals: {}
};

// In-flight prefetch guards so tapping arrows quickly never fires duplicate SQLite queries
const inFlightPrefetches = new Set<string>();

const getCacheKey = (dateRange: DateRange | null, filters: TimelineFilters) => {
    if (!dateRange) return 'all_time';
    return `${dateRange.start}_${dateRange.end}_${filters.transactionType.join(',')}_${filters.categories.join(',')}`;
};

// ── Synchronous helper: read straight from cache ───────────────
const buildStateFromCache = (dateRange: DateRange | null, filters: TimelineFilters) => {
    const cacheKey = getCacheKey(dateRange, filters);
    const cachedTx = globalCache.transactions[cacheKey];

    let isCurrentMonth = false;
    let lastMonthTotals: { income: number; expense: number } | null = null;

    if (dateRange?.start && isSameMonth(new Date(dateRange.start), new Date())) {
        isCurrentMonth = true;
        const lastMonthStart = startOfMonth(subMonths(new Date(), 1)).toISOString();
        const lastMonthEnd = endOfMonth(subMonths(new Date(), 1)).toISOString();
        const totalsCacheKey = getCacheKey({ start: lastMonthStart, end: lastMonthEnd }, filters);
        lastMonthTotals = globalCache.totals[totalsCacheKey] ?? null;
    }

    return {
        data: cachedTx ?? null,        // null means "not in cache yet"
        isCurrentMonth,
        lastMonthTotals,
        loading: !cachedTx,
    };
};

export const isTimelineDataCached = (dateRange: DateRange | null, filters: TimelineFilters) => {
    return !!globalCache.transactions[getCacheKey(dateRange, filters)];
};

export const useTimelineData = (dateRange: DateRange | null, filters: TimelineFilters) => {
    // 1. Hook reads the cache SYNCHRONOUSLY every single render. 
    // This perfectly eliminates the 1-render-cycle lag of `useState`.
    const currentState = buildStateFromCache(dateRange, filters);

    // 2. We only need React state to force a re-render when an async fetch finishes.
    const [, forceRender] = useState({});
    const [error, setError] = useState<string | null>(null);

    const storeTransactions = useTransactionStore(s => s.transactions);
    const storeRefreshTrigger = storeTransactions.length;

    // Clear cache when a transaction is saved/deleted anywhere in the app
    useEffect(() => {
        globalCache.transactions = {};
        globalCache.totals = {};
        inFlightPrefetches.clear();
        forceRender({}); // Force UI to clear
    }, [storeRefreshTrigger]);

    // ── Core fetch ────────────────────────────────────────────────────────────
    const performFetch = async (
        range: DateRange | null,
        currentFilters: TimelineFilters,
        isPrefetch = false
    ): Promise<void> => {
        const cacheKey = getCacheKey(range, currentFilters);

        if (!globalCache.transactions[cacheKey]) {
            const txData = await fetchTimelineTransactionsFromDB(
                range?.start,
                range?.end,
                currentFilters.transactionType.length > 0 ? currentFilters.transactionType : undefined,
                currentFilters.categories.length > 0 ? currentFilters.categories : undefined
            );
            globalCache.transactions[cacheKey] = txData;
        }

        if (range?.start && isSameMonth(new Date(range.start), new Date())) {
            const lastMonthStart = startOfMonth(subMonths(new Date(), 1)).toISOString();
            const lastMonthEnd = endOfMonth(subMonths(new Date(), 1)).toISOString();
            const totalsCacheKey = getCacheKey({ start: lastMonthStart, end: lastMonthEnd }, currentFilters);

            if (globalCache.totals[totalsCacheKey] === undefined) {
                globalCache.totals[totalsCacheKey] = await fetchMonthlyTotalsFromDB(
                    lastMonthStart,
                    lastMonthEnd,
                    currentFilters.transactionType.length > 0 ? currentFilters.transactionType : undefined,
                    currentFilters.categories.length > 0 ? currentFilters.categories : undefined
                );
            }
        }
    };

    // ── Silent background prefetcher ──────────────────────────────────────────
    const prefetchMonth = useCallback((baseDate: Date, direction: 1 | -1) => {
        const targetDate = direction === 1 ? addMonths(baseDate, 1) : subMonths(baseDate, 1);
        const range = {
            start: startOfMonth(targetDate).toISOString(),
            end: endOfMonth(targetDate).toISOString()
        };
        const cacheKey = getCacheKey(range, filters);

        if (globalCache.transactions[cacheKey] !== undefined || inFlightPrefetches.has(cacheKey)) return;

        inFlightPrefetches.add(cacheKey);
        performFetch(range, filters, true)
            .catch(err => console.error('[Timeline] Prefetch error:', err))
            .finally(() => inFlightPrefetches.delete(cacheKey));
    }, [filters]);

    // ── Main effect: fetch ONLY if missing from cache ─────────────────────────
    useEffect(() => {
        // If it's already in cache, just prefetch surrounding months and exit
        if (currentState.data !== null) {
            if (dateRange?.start) {
                const base = new Date(dateRange.start);
                prefetchMonth(base, 1);
                prefetchMonth(base, -1);
            }
            return;
        }

        // It's not in cache, so we must fetch it.
        let isMounted = true;
        setError(null);

        // Guard against double UI-renders if another component already triggered this fetch
        const cacheKey = getCacheKey(dateRange, filters);

        performFetch(dateRange, filters, false)
            .then(() => {
                if (isMounted) {
                    // Only force render if we actually just injected new data into the cache
                    // and we haven't already rendered it.
                    forceRender({});
                    if (dateRange?.start) {
                        const base = new Date(dateRange.start);
                        prefetchMonth(base, 1);
                        prefetchMonth(base, -1);
                    }
                }
            })
            .catch(err => {
                console.error('[Timeline] Failed to fetch:', err);
                if (isMounted) setError(err instanceof Error ? err.message : 'Unknown error');
            });

        return () => {
            isMounted = false;
        };
    }, [
        dateRange?.start,
        dateRange?.end,
        filters.transactionType.join(','),
        filters.categories.join(','),
        // By intentionally NOT putting `currentState.data` in the array, we prevent
        // the effect from re-firing immediately after `forceRender` populates the cache
    ]);

    // Manual refetch trigger
    const refetch = useCallback(async () => {
        await performFetch(dateRange, filters, false);
        forceRender({});
    }, [dateRange?.start, dateRange?.end, filters]);

    return {
        data: currentState.data ?? [],
        lastMonthTotals: currentState.lastMonthTotals,
        isCurrentMonth: currentState.isCurrentMonth,
        loading: currentState.loading,
        error,
        refetch,
    };
};
