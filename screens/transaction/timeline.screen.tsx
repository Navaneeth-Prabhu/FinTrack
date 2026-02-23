import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, ScrollView } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { useTransactionStore } from '@/stores/transactionStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { Screen } from '@/components/layout/Screen';
import { ThemedText } from '@/components/common/ThemedText';
import { useRecurringTransactionStore } from '@/stores/recurringTransactionStore';
import { FilterBottomSheet } from '@/components/bottomSheet/transactionFilterBottomSheet';
import { Ionicons } from '@expo/vector-icons';
import { TimeView } from '@/types';
import { TransactionList } from '@/components/transactions';
import SMSImportButton from '@/components/SMSImportButton';
import { darkTheme, fontSizes, lightTheme } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import usePreferenceStore from '@/stores/preferenceStore';

export default function TimeLineScreen() {
    const { theme } = usePreferenceStore();
    const { transactions, fetchTransactions, isLoading } = useTransactionStore();
    const { recurringTransactions } = useRecurringTransactionStore();
    const { categories } = useCategoryStore();
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    // Track if we've ever successfully fetched — prevents re-fetch on every tab switch
    const hasFetchedRef = useRef(false);

    // Applied filters state (only updated when Apply button is pressed)
    const [appliedFilters, setAppliedFilters] = useState({
        transactionType: [] as string[],
        categories: [] as string[],
    });

    // Temporary filter state (for the bottom sheet UI)
    const [tempFilterState, setTempFilterState] = useState({
        transactionType: [] as string[],
        categories: [] as string[],
    });

    const [selectedView, setSelectedView] = useState<TimeView>('Month');

    // Transactions are now pre-fetched in _layout.tsx during the splash screen

    // Memoize active filters for display
    const activeFilters = useMemo(() => {
        const filters: { type: string, value: string }[] = [];

        appliedFilters.transactionType.forEach(type => {
            filters.push({
                type: 'transactionType',
                value: type
            });
        });

        appliedFilters.categories.forEach(category => {
            filters.push({
                type: 'categories',
                value: category
            });
        });

        return filters;
    }, [appliedFilters.transactionType, appliedFilters.categories]);

    // Memoize filtered transactions based on APPLIED filters only
    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            // Filter by transaction type if any applied
            if (appliedFilters.transactionType.length > 0 && !appliedFilters.transactionType.includes(tx.type)) {
                return false;
            }
            // Filter by category if any applied
            if (appliedFilters.categories.length > 0 && (!tx.category || !appliedFilters.categories.includes(tx.category.name))) {
                return false;
            }
            return true;
        });
    }, [transactions, appliedFilters.transactionType, appliedFilters.categories]);

    // Handle opening the bottom sheet
    const handlePresentModalPress = useCallback(() => {
        // Set temp state to current applied filters when opening
        setTempFilterState({
            transactionType: [...appliedFilters.transactionType],
            categories: [...appliedFilters.categories],
        });

        if (bottomSheetRef.current) {
            bottomSheetRef.current.present();
        } else {
            console.warn("bottomSheetRef is not available");
        }
    }, [appliedFilters]);

    // Filter options
    const filterOptions = useMemo(() => ({
        transactionTypes: [
            { label: 'Income', value: 'income' },
            { label: 'Expense', value: 'expense' },
            { label: 'Transfer', value: 'transfer' }
        ],
        accountTypes: [],
        categories: categories
    }), [categories]);

    // Handle filter changes in the bottom sheet (temporary state)
    const handleFilterChange = useCallback((filterType: string, value: string) => {
        if (filterType === 'categories') {
            setTempFilterState(prev => {
                if (prev.categories.includes(value)) {
                    return {
                        ...prev,
                        categories: prev.categories.filter(cat => cat !== value)
                    };
                } else {
                    return {
                        ...prev,
                        categories: [...prev.categories, value]
                    };
                }
            });
        } else if (filterType === 'transactionType') {
            setTempFilterState(prev => {
                if (prev.transactionType.includes(value)) {
                    return {
                        ...prev,
                        transactionType: prev.transactionType.filter(type => type !== value)
                    };
                } else {
                    return {
                        ...prev,
                        transactionType: [...prev.transactionType, value]
                    };
                }
            });
        }
    }, []);

    // Apply filters - copy temp state to applied state
    const handleApplyFilters = useCallback(() => {
        setAppliedFilters({
            transactionType: [...tempFilterState.transactionType],
            categories: [...tempFilterState.categories],
        });

        if (bottomSheetRef.current) {
            bottomSheetRef.current.dismiss();
        }
    }, [tempFilterState]);

    // Clear filters in bottom sheet (temporary state)
    const handleClearFilters = useCallback(() => {
        setTempFilterState({
            transactionType: [],
            categories: []
        });
    }, []);

    // Remove specific applied filter
    const handleRemoveFilter = useCallback((filter: { type: string, value: string }) => {
        if (filter.type === 'categories') {
            setAppliedFilters(prev => ({
                ...prev,
                categories: prev.categories.filter(cat => cat !== filter.value)
            }));
        } else if (filter.type === 'transactionType') {
            setAppliedFilters(prev => ({
                ...prev,
                transactionType: prev.transactionType.filter(type => type !== filter.value)
            }));
        }
    }, []);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme === 'dark' ? darkTheme.background : lightTheme.card }]}>
            <View style={styles.header}>
                <ThemedText variant="h3" style={styles.title}>Transactions</ThemedText>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => router.push('/transaction/searchTransaction')}
                    >
                        <Ionicons name="search-outline" size={22} color="#666" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={handlePresentModalPress}
                    >
                        <Ionicons name="filter-outline" size={22} color="#666" />
                    </TouchableOpacity>
                </View>
            </View>
            {/* <SMSImportButton style={{ marginBottom: 16 }} /> */}
            {activeFilters.length > 0 && (
                <View style={styles.activeFiltersContainer}>
                    <ThemedText style={styles.filterLabel}>Active Filters:</ThemedText>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filtersRow}
                    >
                        {activeFilters.map((filter, index) => (
                            <TouchableOpacity
                                key={`${filter.type}-${filter.value}`}
                                style={[
                                    styles.filterChip,
                                    { backgroundColor: theme === 'dark' ? darkTheme.card : lightTheme.card }
                                ]}
                                onPress={() => handleRemoveFilter(filter)}
                            >
                                <ThemedText style={styles.filterChipText}>
                                    {filter.value}
                                </ThemedText>
                                <Ionicons name="close-circle" size={16} color="#666" />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            <TransactionList
                transactions={filteredTransactions}
                overView={true}
                recurringTransactions={recurringTransactions}
            />

            <FilterBottomSheet
                bottomSheetRef={bottomSheetRef}
                selectedView={selectedView}
                onViewSelect={setSelectedView}
                filterState={tempFilterState} // Pass temporary state
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                onApplyFilters={handleApplyFilters}
                filterOptions={filterOptions}
            />
        </SafeAreaView>
    );
}

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
        marginBottom: 8
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
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    filterLabel: {
        fontSize: 14,
        marginBottom: 6,
        opacity: 0.7
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