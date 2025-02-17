// src/components/transactions/TransactionList/index.tsx
import React, { useMemo } from 'react';
import { SectionList, View } from 'react-native';
import { Transaction, RecurringTransaction } from '@/types';
import { TransactionItem } from './TransactionItem';
import { ThemedText } from '@/components/common/ThemedText';
import { useTransactionSections } from '@/screens/transaction/hooks/useTransactionSections';
import { SectionHeader } from './SectionHeader';
import { useTheme } from '@/hooks/useTheme';
import { ListFooter } from './ListFooter';
import ListSummary from './ListSummary';

interface TransactionListProps {
    transactions: Transaction[];
    overView?: boolean;
    recurringTransactions?: RecurringTransaction[];
}

export const TransactionList: React.FC<TransactionListProps> = ({
    transactions,
    overView = true,
    recurringTransactions
}) => {
    const { colors } = useTheme();
    const { sections, totals } = useTransactionSections(transactions, recurringTransactions);

    if (sections.length === 0) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ThemedText style={{ color: colors.muted }}>No Transactions</ThemedText>
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <SectionList
                sections={sections}
                keyExtractor={(item, index) => item.id + index}
                renderItem={({ item, section }) => (
                    <TransactionItem
                        transaction={item}
                        isUpcoming={section.isUpcoming}
                    />
                )}
                renderSectionHeader={({ section }) => (
                    <SectionHeader section={section} />
                )}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.background }} />}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={overView ? <ListSummary totals={totals} /> : null}
                ListFooterComponent={<ListFooter totals={totals} count={transactions.length} />}
                stickySectionHeadersEnabled
            // contentContainerStyle={styles.sectionListContent}
            />
        </View>
    );
};
