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

// Separator component
const ItemSeparator = memo(() => {
    const { colors } = useTheme();
    return (
        <View style={[styles.separator, { backgroundColor: colors.border }]} />
    );
});

// Empty list component
const EmptyList = memo(() => {
    return (
        <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>No Transactions</ThemedText>
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
        <MemoizedTransactionItem transaction={item} sectionData={section} />
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
                ItemSeparatorComponent={ItemSeparator}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={ListHeader}
                ListFooterComponent={ListFooterComponent}
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
    separator: {
        height: 1,
        width: '100%',
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