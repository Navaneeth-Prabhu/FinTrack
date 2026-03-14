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
    hasMore: Record<string, boolean>;
}

// Module-level cache to persist across component unmounts
let globalCache: CacheState = {
    transactions: {},
    totals: {},
    hasMore: {},
};

const PAGE_SIZE_ALL_TIME = 250;

// In-flight prefetch guards so tapping arrows quickly never fires duplicate SQLite queries
const inFlightPrefetches = new Set<string>();

const getCacheKey = (dateRange: DateRange | null, filters: TimelineFilters) => {
    const rangeKey = dateRange ? `${dateRange.start}_${dateRange.end}` : 'all_time';
    return `${rangeKey}_${filters.transactionType.join(',')}_${filters.categories.join(',')}`;
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
        hasMore: !!globalCache.hasMore[cacheKey],
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
    const [fetchTrigger, setFetchTrigger] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    const storeTransactions = useTransactionStore(s => s.transactions);

    // Clear cache when ANY transaction is added, updated, or deleted
    useEffect(() => {
        globalCache.transactions = {};
        globalCache.totals = {};
        globalCache.hasMore = {};
        inFlightPrefetches.clear();
        setIsFetchingMore(false);
        setFetchTrigger(t => t + 1); // Triggers main effect to fetch with current closures!
    }, [storeTransactions]);

    // ── Core fetch ────────────────────────────────────────────────────────────
    const performFetch = async (
        range: DateRange | null,
        currentFilters: TimelineFilters,
        isPrefetch = false
    ): Promise<void> => {
        const cacheKey = getCacheKey(range, currentFilters);

        if (!globalCache.transactions[cacheKey]) {
            const typeFilter = currentFilters.transactionType.length > 0 ? currentFilters.transactionType : undefined;
            const categoryFilter = currentFilters.categories.length > 0 ? currentFilters.categories : undefined;
            const limit = range ? undefined : PAGE_SIZE_ALL_TIME;
            const txData = await fetchTimelineTransactionsFromDB(
                range?.start,
                range?.end,
                typeFilter,
                categoryFilter,
                limit,
                0,
            );
            globalCache.transactions[cacheKey] = txData;
            globalCache.hasMore[cacheKey] = range ? false : txData.length === PAGE_SIZE_ALL_TIME;
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
                if (isMounted) {
                    setError(err instanceof Error ? err.message : 'Unknown error');
                    // Prevent infinite loading state by setting the cache to an empty result
                    globalCache.transactions[cacheKey] = [];
                    globalCache.hasMore[cacheKey] = false;
                    forceRender({});
                }
            });

        return () => {
            isMounted = false;
        };
    }, [
        dateRange?.start,
        dateRange?.end,
        filters.transactionType.join(','),
        filters.categories.join(','),
        fetchTrigger // <-- Dependency on cache wipes guarantees fresh closures
    ]);

    // Manual refetch trigger
    const refetch = useCallback(async () => {
        await performFetch(dateRange, filters, false);
        forceRender({});
    }, [dateRange?.start, dateRange?.end, filters]);

    const fetchMore = useCallback(async () => {
        if (dateRange) return; // Only needed in "All" mode.

        const cacheKey = getCacheKey(dateRange, filters);
        const canFetchMore = globalCache.hasMore[cacheKey];
        if (isFetchingMore || !canFetchMore) return;

        setIsFetchingMore(true);
        try {
            const typeFilter = filters.transactionType.length > 0 ? filters.transactionType : undefined;
            const categoryFilter = filters.categories.length > 0 ? filters.categories : undefined;
            const current = globalCache.transactions[cacheKey] ?? [];

            const nextPage = await fetchTimelineTransactionsFromDB(
                undefined,
                undefined,
                typeFilter,
                categoryFilter,
                PAGE_SIZE_ALL_TIME,
                current.length,
            );

            if (nextPage.length > 0) {
                globalCache.transactions[cacheKey] = [...current, ...nextPage];
            }
            globalCache.hasMore[cacheKey] = nextPage.length === PAGE_SIZE_ALL_TIME;
            forceRender({});
        } catch (err) {
            console.error('[Timeline] fetchMore failed:', err);
        } finally {
            setIsFetchingMore(false);
        }
    }, [
        dateRange?.start,
        dateRange?.end,
        filters.transactionType.join(','),
        filters.categories.join(','),
        isFetchingMore,
    ]);

    return {
        data: currentState.data ?? [],
        lastMonthTotals: currentState.lastMonthTotals,
        isCurrentMonth: currentState.isCurrentMonth,
        loading: currentState.loading,
        hasMore: currentState.hasMore,
        isFetchingMore,
        error,
        refetch,
        fetchMore,
    };
};
