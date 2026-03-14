import React, { useCallback, useRef, useState, useMemo } from 'react';
import { View, Pressable, StyleSheet, ScrollView } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import {
    startOfMonth,
    endOfMonth,
    subMonths,
    addMonths,
    isSameMonth,
    startOfDay,
} from 'date-fns';
import { useTransactionStore } from '@/stores/transactionStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { ThemedText } from '@/components/common/ThemedText';
import { useRecurringTransactionStore } from '@/stores/recurringTransactionStore';
import { FilterBottomSheet } from '@/components/bottomSheet/transactionFilterBottomSheet';
import { Ionicons } from '@expo/vector-icons';
import { TransactionList } from '@/components/transactions';
import { useTimelineData } from './hooks/useTimelineData';
import { TimeView } from '@/types';
import { MonthNavigator, TimePreset } from '@/components/transactions/MonthNavigator';
import { darkTheme, fontSizes, lightTheme } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import usePreferenceStore from '@/stores/preferenceStore';

// ─── Zustand selectors (hoisted — stable references, prevent full-store re-renders) ──
const selectTransactions = (s: any) => s.transactions;
const selectRecurringTransactions = (s: any) => s.recurringTransactions;
const selectCategories = (s: any) => s.categories;
const selectTheme = (s: any) => s.theme;

export default function TimeLineScreen() {
    // ── Selective Zustand subscriptions (only re-render when THIS slice changes) ──
    const theme = usePreferenceStore(selectTheme);
    // Remove pulling ALL transactions into memory for the timeline
    const recurringTransactions = useRecurringTransactionStore(selectRecurringTransactions);
    const categories = useCategoryStore(selectCategories);

    const bottomSheetRef = useRef<BottomSheetModal>(null);

    // ── Applied filters (type / category — shown as chips) ────────────────────
    const [appliedFilters, setAppliedFilters] = useState({
        transactionType: [] as string[],
        categories: [] as string[],
    });

    // ── Temp filter state now in a REF to avoid re-rendering the list when
    //    the user interacts with the bottom sheet. The bottom sheet reads from
    //    the ref; we only trigger a state update on Apply. ─────────────────────
    const tempFilterRef = useRef({
        transactionType: [] as string[],
        categories: [] as string[],
    });
    // Counter to force the bottom sheet to re-read ref values when opened
    const [sheetRevision, setSheetRevision] = useState(0);

    // ── Time scope state ──────────────────────────────────────────────────────
    const [selectedMonth, setSelectedMonth] = useState<Date>(() => startOfMonth(new Date()));
    const [timePreset, setTimePreset] = useState<TimePreset | null>(null);

    // ── Date range: hook initialises synchronously from cache, no deferral needed ─
    const dateRange = useMemo(() => {
        if (timePreset === 'All') return null;
        const now = startOfDay(new Date());
        if (timePreset === '3M') return { start: subMonths(now, 3).toISOString(), end: '9999-12-31T23:59:59.999Z' };
        if (timePreset === '6M') return { start: subMonths(now, 6).toISOString(), end: '9999-12-31T23:59:59.999Z' };
        return {
            start: startOfMonth(selectedMonth).toISOString(),
            end: endOfMonth(selectedMonth).toISOString(),
        };
    }, [selectedMonth, timePreset]);

    // ── Direct SQLite Fetching (Instant, zero JS array reallocation) ─────────
    // This replaces in-memory Zustand filtering. When dateRange or filters change,
    // this hook queries the DB directly for exactly what we need.
    const {
        data: filteredTransactions,
        lastMonthTotals,
        isCurrentMonth,
        loading: dbLoading,
        hasMore: timelineHasMore,
        isFetchingMore: timelineIsFetchingMore,
        fetchMore: fetchMoreTimelineTransactions,
    } = useTimelineData(dateRange, appliedFilters);

    // ── Active filter chips (unchanged) ──────────────────────────────────────
    const activeFilters = useMemo(() => {
        const filters: { type: string; value: string }[] = [];
        appliedFilters.transactionType.forEach(type =>
            filters.push({ type: 'transactionType', value: type })
        );
        appliedFilters.categories.forEach(category =>
            filters.push({ type: 'categories', value: category })
        );
        return filters;
    }, [appliedFilters.transactionType, appliedFilters.categories]);

    // ── Month navigation ──────────────────────────────────────────────────────
    const handlePrevMonth = useCallback(() => {
        setSelectedMonth(prev => startOfMonth(subMonths(prev, 1)));
    }, []);

    const handleNextMonth = useCallback(() => {
        setSelectedMonth(prev => {
            const next = addMonths(prev, 1);
            return isSameMonth(next, new Date()) || next < new Date()
                ? startOfMonth(next)
                : prev;
        });
    }, []);

    const handlePresetSelect = useCallback((preset: TimePreset) => {
        setTimePreset(prev => (prev === preset ? null : preset));
        setSelectedMonth(startOfMonth(new Date()));
    }, []);

    // ── Filter bottom sheet handlers (use ref to avoid re-rendering list) ─────
    const handlePresentModalPress = useCallback(() => {
        // Snapshot applied filters into the ref for the sheet to read
        tempFilterRef.current = {
            transactionType: [...appliedFilters.transactionType],
            categories: [...appliedFilters.categories],
        };
        setSheetRevision(r => r + 1);
        bottomSheetRef.current?.present();
    }, [appliedFilters]);

    const filterOptions = useMemo(() => ({
        transactionTypes: [
            { label: 'Income', value: 'income' },
            { label: 'Expense', value: 'expense' },
            { label: 'Transfer', value: 'transfer' },
        ],
        accountTypes: [],
        categories,
    }), [categories]);

    // The bottom sheet still needs to show its current selections, so we keep
    // a thin state wrapper that ONLY the sheet subscribes to (via sheetRevision).
    const tempFilterState = tempFilterRef.current;

    const handleFilterChange = useCallback((filterType: string, value: string) => {
        const ref = tempFilterRef.current;
        if (filterType === 'categories') {
            ref.categories = ref.categories.includes(value)
                ? ref.categories.filter(cat => cat !== value)
                : [...ref.categories, value];
        } else if (filterType === 'transactionType') {
            ref.transactionType = ref.transactionType.includes(value)
                ? ref.transactionType.filter(type => type !== value)
                : [...ref.transactionType, value];
        }
        // Force the sheet UI to update (but NOT the list)
        setSheetRevision(r => r + 1);
    }, []);

    const handleApplyFilters = useCallback(() => {
        setAppliedFilters({
            transactionType: [...tempFilterRef.current.transactionType],
            categories: [...tempFilterRef.current.categories],
        });
        bottomSheetRef.current?.dismiss();
    }, []);

    const handleClearFilters = useCallback(() => {
        tempFilterRef.current = { transactionType: [], categories: [] };
        setSheetRevision(r => r + 1);
    }, []);

    const handleRemoveFilter = useCallback((filter: { type: string; value: string }) => {
        if (filter.type === 'categories') {
            setAppliedFilters(prev => ({
                ...prev,
                categories: prev.categories.filter(cat => cat !== filter.value),
            }));
        } else if (filter.type === 'transactionType') {
            setAppliedFilters(prev => ({
                ...prev,
                transactionType: prev.transactionType.filter(type => type !== filter.value),
            }));
        }
    }, []);

    // ── Derived colours (stable as long as theme doesn't change) ──────────────
    const containerBg = theme === 'dark' ? darkTheme.background : lightTheme.card;
    const filterChipBg = theme === 'dark' ? darkTheme.card : lightTheme.card;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: containerBg }]}>
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <ThemedText variant="h3" style={styles.title}>Transactions</ThemedText>
                <View style={styles.headerActions}>
                    <Pressable
                        style={styles.iconButton}
                        onPress={navigateToSearch}
                        hitSlop={ICON_HIT_SLOP}
                    >
                        <Ionicons name="search-outline" size={22} color="#666" />
                    </Pressable>
                    <Pressable
                        style={styles.iconButton}
                        onPress={handlePresentModalPress}
                        hitSlop={ICON_HIT_SLOP}
                    >
                        <Ionicons name="filter-outline" size={22} color="#666" />
                    </Pressable>
                </View>
            </View>

            {/* ── Month navigator + presets ─────────────────────────────────── */}
            <MonthNavigator
                selectedMonth={selectedMonth}
                timePreset={timePreset}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
            />

            {/* ── Active type/category filter chips ─────────────────────────── */}
            {activeFilters.length > 0 ? (
                <View style={styles.activeFiltersContainer}>
                    <ThemedText style={styles.filterLabel}>Active Filters:</ThemedText>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filtersRow}
                    >
                        {activeFilters.map((filter) => (
                            <Pressable
                                key={`${filter.type}-${filter.value}`}
                                style={[styles.filterChip, { backgroundColor: filterChipBg }]}
                                onPress={() => handleRemoveFilter(filter)}
                            >
                                <ThemedText style={styles.filterChipText}>
                                    {filter.value}
                                </ThemedText>
                                <Ionicons name="close-circle" size={16} color="#666" />
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>
            ) : null}

            {/* ── Transaction list ──────────────────────────────────────────── */}
            <TransactionList
                transactions={filteredTransactions || []}
                overView={true}
                recurringTransactions={recurringTransactions}
                isFetching={dbLoading}
                isCurrentMonth={isCurrentMonth}
                lastMonthTotals={lastMonthTotals}
                paginationMode={timePreset === 'All' ? 'external' : 'none'}
                onLoadMore={fetchMoreTimelineTransactions}
                externalHasMore={timelineHasMore}
                externalIsFetchingMore={timelineIsFetchingMore}
            />

            {/* ── Filter bottom sheet ───────────────────────────────────────── */}
            <FilterBottomSheet
                bottomSheetRef={bottomSheetRef}
                timePreset={timePreset}
                onPresetSelect={handlePresetSelect}
                filterState={tempFilterState}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                onApplyFilters={handleApplyFilters}
                filterOptions={filterOptions}
            />
        </SafeAreaView>
    );
}

// ─── Hoisted statics ─────────────────────────────────────────────────────────
const ICON_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;

// Stable navigation callback (no deps, prevents re-creation)
const navigateToSearch = () => router.push('/transaction/searchTransaction');

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: 8,
    },
    title: {
        fontSize: fontSizes.FONT24,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        padding: 8,
        marginLeft: 8,
    },
    activeFiltersContainer: {
        paddingHorizontal: 0,
        marginBottom: 12,
    },
    filterLabel: {
        fontSize: 14,
        marginBottom: 6,
        opacity: 0.7,
    },
    filtersRow: {
        flexDirection: 'row',
        paddingRight: 16,
        paddingLeft: 2,
        gap: 8,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    filterChipText: {
        fontSize: 12,
    },
});
