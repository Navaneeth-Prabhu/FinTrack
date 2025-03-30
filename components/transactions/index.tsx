import React, { useCallback, memo } from 'react';
import { SectionList, View, StyleSheet } from 'react-native';
import { Transaction, RecurringTransaction } from '@/types';
import { TransactionItem } from './TransactionItem';
import { ThemedText } from '@/components/common/ThemedText';
import { useTransactionSections } from '@/screens/transaction/hooks/useTransactionSections';
import { SectionHeader } from './SectionHeader';
import { useTheme } from '@/hooks/useTheme';
import ListSummary from './ListSummary';
import { ListFooter } from './ListFooter';

interface TransactionListProps {
    transactions: Transaction[];
    overView?: boolean;
    recurringTransactions?: RecurringTransaction[];
}

// Memoized TransactionItem to prevent unnecessary re-renders
const MemoizedTransactionItem = memo(TransactionItem);

// Memoized SectionHeader component
const MemoizedSectionHeader = memo(SectionHeader);


// Empty list component
const EmptyList = memo(() => {
    const { colors } = useTheme();
    return (
        <View style={styles.emptyContainer}>
            <ThemedText style={[styles.emptyText, { color: colors.subtitle }]}>
                No Transactions
            </ThemedText>
        </View>
    );
});

export const TransactionList: React.FC<TransactionListProps> = memo(({
    transactions,
    overView = true,
    recurringTransactions,
}) => {
    const { colors } = useTheme();
    const { sections, totals } = useTransactionSections(transactions, recurringTransactions);

    // Memoized render functions to prevent recreation on each render
    const renderItem = useCallback(({ item, section }) => (
        <MemoizedTransactionItem transaction={item} isUpcoming={section.isUpcoming} />
    ), []);

    const renderSectionHeader = useCallback(({ section }) => (
        <MemoizedSectionHeader section={section} />
    ), []);

    const keyExtractor = useCallback((item: Transaction, index: number) =>
        `transaction-${item.id ?? index}`, []);

    const ListHeader = useCallback(() => (
        overView ? <ListSummary totals={totals} /> : null
    ), [overView, totals]);

    const ListFooterComponent = useCallback(() => (
        <ListFooter totals={totals} count={transactions.length} />
    ), [totals, transactions.length]);

    if (sections.length === 0) {
        return <EmptyList />;
    }

    return (
        <View style={styles.container}>
            <SectionList
                sections={sections}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
                ListHeaderComponent={ListHeader}
                ListFooterComponent={ListFooterComponent}
                SectionSeparatorComponent={() => <View style={styles.separator} />}
                stickySectionHeadersEnabled
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={5}
                updateCellsBatchingPeriod={50}
                removeClippedSubviews={true}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    itemSeparator: {
        height: 6,
        width: '100%',
    },
    separator: {
        height: 16,
        width: '100%'
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 16,
        textAlign: 'center',
    }
});