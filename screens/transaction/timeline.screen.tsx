// src/app/transactions.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
// import { TimeView } from '../types';
// import { DateNavigator } from './DateNavigator';
// import { ActiveFilterChips } from './ActiveFilterChips';
import { router } from 'expo-router';
import { useTransactionStore } from '@/stores/transactionStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { TransactionList } from '@/components/transactions';
import { useTransactionFilters } from './hooks/useTransactionFilters';
import { getDateRange } from '@/utils/date';
import { Screen } from '@/components/layout/Screen';
import { Header } from '@/components/layout/Header';
import { ThemedText } from '@/components/common/ThemedText';

export default function TimeLineScreen() {
    const { transactions, fetchTransactions } = useTransactionStore()
    const { categories } = useCategoryStore()
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        fetchTransactions()
    }, [])

    // const recurringTransactions = useSelector((state: RootState) =>
    //     state.recurringTransactions.recurringTransactions
    // );

    // const {
    //     selectedView,
    //     setSelectedView,
    //     currentDate,
    //     customRange,
    //     setCustomRange,
    //     getDateRange,
    //     formatDate,
    //     navigate
    // } = useDateNavigation();

    // const dateRange = getDateRange(currentDate, selectedView);

    // const {
    //     filterState,
    //     activeFilters,
    //     filteredTransactions,
    //     handleFilterChange,
    //     handleApplyFilters,
    //     handleClearFilters,
    //     handleRemoveFilter
    // } = useTransactionFilters(transactions, dateRange);

    // const handleViewSelect = (view: TimeView) => {
    //     setSelectedView(view);
    //     if (view === 'Custom') {
    //         setShowDatePicker(true);
    //     }
    // };

    // const handleDatePickerConfirm = (selectedDate: Date) => {
    //     setCustomRange(prev => ({
    //         ...prev,
    //         start: prev.start ? prev.start : selectedDate,
    //         end: prev.start ? selectedDate : null,
    //     }));
    //     if (customRange.start && customRange.end) {
    //         setShowDatePicker(false);
    //     }
    // };

    // const handleApply = () => {
    //     handleApplyFilters();
    //     setShowDatePicker(false);
    //     bottomSheetRef.current?.dismiss()
    // }



    return (
        <Screen scroll={false} style={styles.container}>
            <TouchableOpacity
                onPress={() => router.push('/transaction/searchTransaction')}
            >
                <ThemedText>search</ThemedText>
            </TouchableOpacity>
            {/* <DateNavigator
                currentDate={currentDate}
                selectedView={selectedView}
                formatDate={formatDate}
                onNavigate={navigate}
                onFilterPress={() => bottomSheetRef.current?.present()}
                onSearch={() => router.push('/transactions/searchTransactions')}
            /> */}
            <View>
                {/* <ActiveFilterChips
                    filters={activeFilters}
                    onRemove={handleRemoveFilter}
                    label="Active Filters" /> */}
                    <Text>Active Filters</Text>
            </View>
            <TransactionList
                transactions={transactions}
                //   recurringTransactions={recurringTransactions}
                overView={true}
            />
            {/* <FilterBottomSheet
                bottomSheetRef={bottomSheetRef}
                selectedView={selectedView}
                onViewSelect={handleViewSelect}
                filterState={filterState}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                onApplyFilters={handleApply}
                filterOptions={{ ...filterOptions, categories: categories }}
            /> */}

            {/* <DatePickerModal
        isVisible={showDatePicker}
        onConfirm={handleDatePickerConfirm}
        onCancel={() => setShowDatePicker(false)}
      /> */}
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: 24
    },
    title: {
        fontSize: 18,
        color: 'white',
        fontWeight: 'bold'
    },
    filterButton: { padding: 8 },
    navigationControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        alignItems: 'center'
    },
});
