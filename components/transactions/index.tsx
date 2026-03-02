import React, { useCallback, memo, useMemo } from 'react';
import { View, StyleSheet, Platform, Alert, ActivityIndicator } from 'react-native';
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
import { darkTheme, lightTheme } from '@/constants/theme';
import usePreferenceStore from '@/stores/preferenceStore';

interface TransactionListProps {
    transactions: Transaction[];
    overView?: boolean;
    recurringTransactions?: RecurringTransaction[];
    isFetching?: boolean;
    isCurrentMonth?: boolean;
    lastMonthTotals?: { income: number; expense: number } | null;
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
            <ThemedText style={[styles.emptySubText, { color: colors.subtitle }]}>
                Pull down to refresh or check for SMS
            </ThemedText>
        </View>
    );
});

// ─── Main component ───────────────────────────────────────────────────────────
export const TransactionList: React.FC<TransactionListProps> = memo(({
    transactions,
    overView = true,
    recurringTransactions,
    isFetching = false,
    isCurrentMonth = false,
    lastMonthTotals = null,
}) => {
    // ── Hooks (always at top, no early returns before this) ──────────────────
    const { colors } = useTheme();
    const { theme } = usePreferenceStore();
    const { sections, totals } = useTransactionSections(transactions, recurringTransactions);

    const categories = useCategoryStore(state => state.categories);
    const { saveTransaction, fetchMoreTransactions, isFetchingMore, hasMore, isLoading } = useTransactionStore();
    const [loading, setLoading] = React.useState(false);

    // Derived once, not recalculated in every renderItem call
    const sectionBg = theme === 'dark' ? darkTheme.background : lightTheme.card;

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
                    item.isFirst ? styles.headerFirst : styles.headerRest,
                    { backgroundColor: sectionBg },
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
    }, [sectionBg]);

    // Tells FlashList which recycling pool to use — critical for performance
    const getItemType = useCallback((item: ListItem) => item.type, []);

    // ── FlashList stable keys ──────────────────────────────────────────────────
    // Without this, React uses array indices. If the user changes filters/months,
    // the indices change, causing a complete unmount/remount of the list tree.
    const keyExtractor = useCallback((item: ListItem) => {
        return item.type === 'header'
            ? `header-${item.section.title}`
            : `tx-${item.transaction.id}`;
    }, []);

    const ListHeader = useCallback(() => (
        overView ? <ListSummary totals={totals} isCurrentMonth={isCurrentMonth} lastMonthTotals={lastMonthTotals} /> : null
    ), [overView, totals, isCurrentMonth, lastMonthTotals]);

    const ListFooterComponent = useCallback(() => (
        <ListFooter totals={totals} count={transactions.length} isFetchingMore={isFetchingMore} />
    ), [totals, transactions.length, isFetchingMore]);

    // ── FlashList stable callbacks ────────────────────────────────────────────
    const overrideItemLayout = useCallback((layout: any, item: ListItem) => {
        layout.size = item.type === 'header' ? (item.isFirst ? 40 : 52) : 88;
    }, []);

    const renderEmpty = useCallback(() => {
        if ((isLoading || isFetching) && flatData.length === 0) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <ThemedText style={[styles.loadingText, { color: colors.subtitle }]}>Loading transactions...</ThemedText>
                </View>
            );
        }
        return <EmptyList />;
    }, [isLoading, isFetching, flatData.length, colors]);

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

    // ── Refresh Handler ───────────────────────────────────────────────────────
    const handleRefresh = useCallback(async () => {
        if (loading) return;
        setLoading(true);
        try {
            // 1. Refresh transactions from database
            await useTransactionStore.getState().fetchTransactions(50);

            // 2. Import new SMS transactions if on Android
            if (Platform.OS === 'android') {
                await importSMSTransactionsToStore(categories, saveTransaction);
            }
        } catch (error) {
            console.error('[TransactionList] Refresh failed:', error);
        } finally {
            setLoading(false);
        }
    }, [loading, categories, saveTransaction]);

    // ── Pagination Handler ────────────────────────────────────────────────────
    const handleEndReached = useCallback(() => {
        if (!isFetchingMore && hasMore) {
            fetchMoreTransactions().catch(console.error);
        }
    }, [isFetchingMore, hasMore, fetchMoreTransactions]);

    // ── Conditional renders (after all hooks) ─────────────────────────────────
    if (Platform.OS !== 'android') return null;

    // ── Main render ───────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            <FlashList
                data={flatData}
                renderItem={renderItem}
                getItemType={getItemType}
                keyExtractor={keyExtractor}
                // Updated to match the actual measured item height + margin (80 + 8 = 88)
                estimatedItemSize={88}
                // Setting estimatedListSize helps FlashList skip a major layout calculation step
                estimatedListSize={ESTIMATED_LIST_SIZE}
                stickyHeaderIndices={stickyIndices}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={ListHeader}
                ListFooterComponent={ListFooterComponent}
                ListEmptyComponent={renderEmpty}
                onRefresh={handleRefresh}
                refreshing={loading}
                // Pagination props
                onEndReached={handleEndReached}
                onEndReachedThreshold={0.5} // Trigger when half a screen from bottom
                // Performance tuning - explicit hints skip measuring phases
                overrideItemLayout={overrideItemLayout}
            />
        </View>
    );
});

// ─── Constants ────────────────────────────────────────────────────────────────
const ESTIMATED_LIST_SIZE = { height: 800, width: 400 };

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerWrapper: {
        // Base styles — paddingTop/Bottom split out below
    },
    headerFirst: {
        paddingTop: 0,
        paddingBottom: 8,
    },
    headerRest: {
        paddingTop: 12,
        paddingBottom: 8,
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
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    emptySubText: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        opacity: 0.7,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
    }
});