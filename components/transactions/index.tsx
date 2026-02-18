import React, { useCallback, memo, useMemo } from 'react';
import { View, StyleSheet, Platform, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Transaction, RecurringTransaction } from '@/types';
import { TransactionItem } from './TransactionItem';
import { ThemedText } from '@/components/common/ThemedText';
import { useTransactionSections } from '@/screens/transaction/hooks/useTransactionSections';
import { SectionHeader } from './SectionHeader';
import { useTheme } from '@/hooks/useTheme';
import ListSummary from './ListSummary';
import { ListFooter } from './ListFooter';
import { useCategoryStore } from '@/stores/categoryStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { importSMSTransactionsToStore } from '@/utils/SMSTransactionUtil';

interface TransactionListProps {
    transactions: Transaction[];
    overView?: boolean;
    recurringTransactions?: RecurringTransaction[];
}

// ─── Item type union ─────────────────────────────────────────────────────────
type HeaderItem = {
    type: 'header';
    section: {
        title: string;
        totalIncome: number;
        totalExpense: number;
        isUpcoming?: boolean;
    };
    isFirst: boolean;
};

type TransactionItem2 = {
    type: 'transaction';
    transaction: Transaction;
    isUpcoming: boolean;
};

type ListItem = HeaderItem | TransactionItem2;

// ─── Sub-components (memoized outside parent to keep references stable) ───────
const MemoizedTransactionItem = memo(TransactionItem);
const MemoizedSectionHeader = memo(SectionHeader);

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

// ─── Main component ───────────────────────────────────────────────────────────
export const TransactionList: React.FC<TransactionListProps> = memo(({
    transactions,
    overView = true,
    recurringTransactions,
}) => {
    // ── Hooks (always at top, no early returns before this) ──────────────────
    const { colors } = useTheme();
    const { sections, totals } = useTransactionSections(transactions, recurringTransactions);
    const categories = useCategoryStore(state => state.categories);
    const saveTransaction = useTransactionStore(state => state.saveTransaction);
    const [loading, setLoading] = React.useState(false);

    // ── Flatten sections → single array for FlashList ────────────────────────
    // FlashList requires a flat data array; we embed headers as items and track
    // their indices for stickyHeaderIndices.
    const { flatData, stickyIndices } = useMemo<{
        flatData: ListItem[];
        stickyIndices: number[];
    }>(() => {
        const data: ListItem[] = [];
        const sticky: number[] = [];

        sections.forEach((section, sectionIndex) => {
            sticky.push(data.length);
            data.push({
                type: 'header',
                section: {
                    title: section.title,
                    totalIncome: section.totalIncome,
                    totalExpense: section.totalExpense,
                    isUpcoming: section.isUpcoming,
                },
                isFirst: sectionIndex === 0,
            });

            section.data.forEach(transaction => {
                data.push({
                    type: 'transaction',
                    transaction,
                    isUpcoming: !!section.isUpcoming,
                });
            });
        });

        return { flatData: data, stickyIndices: sticky };
    }, [sections]);

    // ── Render callbacks (stable references via useCallback) ─────────────────
    const renderItem = useCallback(({ item }: { item: ListItem }) => {
        if (item.type === 'header') {
            return (
                <View style={[
                    styles.headerWrapper,
                    { marginTop: item.isFirst ? 0 : 12, backgroundColor: colors.background },
                ]}>
                    <MemoizedSectionHeader section={item.section} />
                </View>
            );
        }
        return (
            <View style={styles.itemWrapper}>
                <MemoizedTransactionItem
                    transaction={item.transaction}
                    isUpcoming={item.isUpcoming}
                />
            </View>
        );
    }, [colors.background]);

    // Tells FlashList which recycling pool to use — critical for performance
    const getItemType = useCallback((item: ListItem) => item.type, []);

    const ListHeader = useCallback(() => (
        overView ? <ListSummary totals={totals} /> : null
    ), [overView, totals]);

    const ListFooterComponent = useCallback(() => (
        <ListFooter totals={totals} count={transactions.length} />
    ), [totals, transactions.length]);

    // ── SMS import handler ────────────────────────────────────────────────────
    const handleImport = useCallback(async () => {
        if (Platform.OS !== 'android') {
            Alert.alert('Not Available', 'SMS import is only available on Android devices');
            return;
        }
        if (loading) return;
        setLoading(true);
        try {
            const importCount = await importSMSTransactionsToStore(categories, saveTransaction);
            if (importCount > 0) {
                Alert.alert('Import Successful', `Successfully imported ${importCount} transactions from your SMS messages.`);
            } else {
                Alert.alert('No Transactions Found', 'No new financial transactions were found in your SMS messages.');
            }
        } catch (error) {
            console.error('Error during SMS import:', error);
            Alert.alert('Import Failed', 'There was an error importing transactions from SMS.');
        } finally {
            setLoading(false);
        }
    }, [loading, categories, saveTransaction]);

    const handleRefresh = useCallback(() => {
        handleImport();
    }, [handleImport]);

    // ── Conditional renders (after all hooks) ─────────────────────────────────
    if (Platform.OS !== 'android') return null;
    if (flatData.length === 0) return <EmptyList />;

    // ── Main render ───────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            <FlashList
                data={flatData}
                renderItem={renderItem}
                getItemType={getItemType}
                estimatedItemSize={72}
                stickyHeaderIndices={stickyIndices}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={ListHeader}
                ListFooterComponent={ListFooterComponent}
                onRefresh={handleRefresh}
                refreshing={loading}
                // Performance tuning
                overrideItemLayout={(layout, item) => {
                    // Give FlashList more accurate size hints to reduce layout thrash
                    layout.size = item.type === 'header' ? 40 : 72;
                }}
            />
        </View>
    );
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerWrapper: {
        // Background ensures sticky header covers scrolling content
    },
    itemWrapper: {
        marginBottom: 8,
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
    },
});