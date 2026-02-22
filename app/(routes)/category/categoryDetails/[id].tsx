import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { parseISO, format, isSameMonth, addMonths, subMonths, startOfMonth, endOfMonth, differenceInMonths, isSameYear, min } from 'date-fns';
import { formatLargeNumber } from '@/utils/numberUtl';
import { useCategoryStore } from '@/stores/categoryStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/common/ThemedText';
import { Transaction } from '@/types';
import { TransactionItem } from '@/components/transactions/TransactionItem';
import { FlashList } from '@shopify/flash-list';

const CategoryDetails = () => {
    const { id, month, category } = useLocalSearchParams();
    const navigation = useNavigation();
    const router = useRouter()
    const { colors } = useTheme();

    const { transactions } = useTransactionStore()
    const { categories } = useCategoryStore()

    const categoryDetail = categories.find((category) => category.id === id);
    const parsedMonth = month && typeof month === 'string' ? parseISO(month) : new Date();
    const [selectedMonth, setSelectedMonth] = useState<Date>(parsedMonth);
    const filteredTransactions = React.useMemo(() => {
        return transactions.filter(
            (item) =>
                item.category.id === id &&
                isSameMonth(parseISO(item.date), selectedMonth) &&
                isSameYear(parseISO(item.date), selectedMonth)
        );
    }, [transactions, id, selectedMonth]);

    useLayoutEffect(() => {
        navigation.setOptions({
            title: `${category}`,
            headerShown: true,
        });
    }, [category, navigation]);

    const { chartData, availableMonths } = React.useMemo(() => {
        if (!transactions.length) return { chartData: [], availableMonths: [] };

        const filteredCategoryTransactions = transactions.filter(
            (item) => item.category.name === category
        );

        const groupedData = filteredCategoryTransactions.reduce((acc: Record<string, number>, item) => {
            const date = parseISO(item.date);
            const monthKey = format(date, 'yyyy-MM');
            acc[monthKey] = (acc[monthKey] || 0) + item.amount;
            return acc;
        }, {});

        const today = startOfMonth(new Date());
        const transactionDates = filteredCategoryTransactions.map(t => parseISO(t.date));
        const earliestDate = transactionDates.length > 0
            ? startOfMonth(min(transactionDates))
            : today;

        const monthsDiff = Math.abs(differenceInMonths(today, earliestDate));
        const totalMonths = Math.max(6, monthsDiff + 1); // 6 matching the previous logic's min
        const startDate = subMonths(today, totalMonths - 1);

        const monthsRange = Array.from({ length: totalMonths }, (_, i) => addMonths(startDate, i));

        const data = monthsRange.map((date) => {
            const monthKey = format(date, 'yyyy-MM');
            const displayLabel = isSameYear(date, new Date())
                ? format(date, 'MMM')
                : format(date, "MMM''yy");

            const amount = groupedData[monthKey] || 0;
            return {
                value: amount,
                label: displayLabel,
                onPress: () => setSelectedMonth(date),
                topLabelComponent: () => (
                    <View style={styles.topLabelContainer}>
                        <Text style={[styles.topLabel, { color: colors.text }]}>
                            {amount > 0 ? formatLargeNumber(amount) : '0'}
                        </Text>
                    </View>
                ),
            };
        });

        return { chartData: data, availableMonths: monthsRange };
    }, [transactions, category, colors.text]);

    const isCurrentYear = isSameYear(selectedMonth, new Date());
    const headerDateText = isCurrentYear
        ? format(selectedMonth, 'MMMM')
        : format(selectedMonth, 'MMMM yyyy');

    const renderTransactionItem = useCallback(({ item }: { item: Transaction }) => (
        <TransactionItem
            transaction={item}
        />
    ), []);

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ backgroundColor: colors.card, paddingVertical: 16 }}>
                <BarChart
                    data={chartData}
                    barWidth={40}
                    noOfSections={4}
                    barBorderRadius={4}
                    frontColor={categoryDetail?.color || colors.primary}
                    activeOpacity={0.7}
                    initialSpacing={10}
                    yAxisThickness={0}
                    xAxisThickness={0}
                    hideYAxisText={true}
                    showXAxisIndices={false}
                    showYAxisIndices={false}
                    xAxisLabelTextStyle={{ color: colors.text, fontSize: 12 }}
                    autoShiftLabels={true}
                    hideRules
                    scrollToEnd
                />
            </View>
            <View style={{ flex: 1 }}>
                <FlashList
                    data={filteredTransactions}
                    keyExtractor={(item) => item.id}
                    renderItem={renderTransactionItem}
                    estimatedItemSize={60}
                    ListHeaderComponent={
                        <View style={{ paddingVertical: 16 }}>
                            <ThemedText style={styles.sectionTitle}>
                                Transactions for {headerDateText}
                            </ThemedText>
                        </View>
                    }
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No transactions for this month.</Text>
                    }
                    ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
                />
            </View>
        </View>
    );
};


export default CategoryDetails;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 10,
    },
    transactionItem: {
        padding: 12,
        flexDirection: 'row',
        gap: 8
    },
    textContainer: {
        alignItems: 'flex-start',
        justifyContent: 'center',
        gap: 4
    },
    circle: {
        height: 45,
        width: 45,
        borderRadius: 10,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center'
    },
    transactionDate: {
        fontSize: 14,
        color: '#666',
    },
    transactionAmount: {

    },
    transactionNote: {
        fontSize: 14,
        color: '#999',
    },
    emptyText: {
        textAlign: 'center',
        color: '#666',
        marginTop: 20,
    },
    graphView: {
        borderRadius: 10,
        overflow: 'hidden',
    },
    topLabelContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        // marginBottom: 1,
    },
    topLabel: {
        fontWeight: '600',
        fontSize: 10,
    },
    itemSeparator: {
        height: 8,
    }
});
