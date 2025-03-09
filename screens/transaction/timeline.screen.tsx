import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
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

export default function TimeLineScreen() {
    const { transactions, fetchTransactions } = useTransactionStore();
    const { recurringTransactions } = useRecurringTransactionStore();
    const { categories } = useCategoryStore();
    const bottomSheetRef = useRef<BottomSheetModal>(null);

    // Filter state
    const [selectedView, setSelectedView] = useState<TimeView>('Month');
    const [filterState, setFilterState] = useState({
        transactionType: '',
        categories: [] as string[],
    });
    const [activeFilters, setActiveFilters] = useState<{ type: string, value: string }[]>([]);

    useEffect(() => {
        fetchTransactions();
    }, []);

    // Handle opening the bottom sheet
    const handlePresentModalPress = useCallback(() => {
        if (bottomSheetRef.current) {
            bottomSheetRef.current.present();
        } else {
            console.warn("bottomSheetRef is not available");
        }
    }, []);

    // Filter options
    const filterOptions = {
        transactionTypes: [
            { label: 'Income', value: 'income' },
            { label: 'Expense', value: 'expense' },
            { label: 'Transfer', value: 'transfer' }
        ],
        accountTypes: [],
        categories: categories
    };

    // Handle filter changes
    const handleFilterChange = (filterType: string, value: string) => {
        if (filterType === 'category') {
            setFilterState(prev => {
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
        } else {
            setFilterState(prev => ({
                ...prev,
                [filterType]: prev[filterType] === value ? '' : value
            }));
        }
    };

    // Apply filters
    const handleApplyFilters = () => {
        const newActiveFilters: { type: string, value: string }[] = [];

        if (filterState.transactionType) {
            newActiveFilters.push({
                type: 'transactionType',
                value: filterState.transactionType
            });
        }

        filterState.categories.forEach(category => {
            newActiveFilters.push({
                type: 'category',
                value: category
            });
        });

        setActiveFilters(newActiveFilters);
        if (bottomSheetRef.current) {
            bottomSheetRef.current.dismiss();
        }
    };

    // Clear filters
    const handleClearFilters = () => {
        setFilterState({
            transactionType: '',
            categories: []
        });
    };

    // Remove specific filter
    const handleRemoveFilter = (filter: { type: string, value: string }) => {
        if (filter.type === 'category') {
            setFilterState(prev => ({
                ...prev,
                categories: prev.categories.filter(cat => cat !== filter.value)
            }));
        } else {
            setFilterState(prev => ({
                ...prev,
                [filter.type]: ''
            }));
        }

        setActiveFilters(prev =>
            prev.filter(f => !(f.type === filter.type && f.value === filter.value))
        );
    };

    return (
        <Screen scroll={false} style={styles.container}>
            <View style={styles.header}>
                <ThemedText style={styles.title}>Transactions</ThemedText>
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

            {activeFilters.length > 0 && (
                <View style={styles.activeFiltersContainer}>
                    <ThemedText style={styles.filterLabel}>Active Filters:</ThemedText>
                    <View style={styles.filtersRow}>
                        {activeFilters.map((filter, index) => (
                            <TouchableOpacity
                                key={`${filter.type}-${filter.value}-${index}`}
                                style={styles.filterChip}
                                onPress={() => handleRemoveFilter(filter)}
                            >
                                <ThemedText style={styles.filterChipText}>
                                    {filter.value}
                                </ThemedText>
                                <Ionicons name="close-circle" size={16} color="#666" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            <TransactionList
                transactions={transactions}
                overView={true}
                recurringTransactions={recurringTransactions}
            />

            <FilterBottomSheet
                bottomSheetRef={bottomSheetRef}
                selectedView={selectedView}
                onViewSelect={setSelectedView}
                filterState={filterState}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                onApplyFilters={handleApplyFilters}
                filterOptions={filterOptions}
            />
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 8
    },
    title: {
        fontSize: 20,
        fontWeight: '600'
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
        flexWrap: 'wrap',
        gap: 8,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    filterChipText: {
        fontSize: 12,
    },
});