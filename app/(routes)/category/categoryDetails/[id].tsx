import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { parseISO, format, isSameMonth, addMonths, subMonths, startOfMonth, endOfMonth, differenceInMonths } from 'date-fns';
// import { formatLargeNumber } from '@/src/utils';
import { useCategoryStore } from '@/stores/categoryStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/common/ThemedText';
import { Transaction } from '@/types';
import { TransactionItem } from '@/components/transactions/TransactionItem';

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
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);
    const [availableMonths, setAvailableMonths] = useState<Date[]>([]);

    useLayoutEffect(() => {
        navigation.setOptions({
            title: `${category}`,
            headerShown: true,
        });
    }, [category]);

    useEffect(() => {
        const filtered = transactions.filter(
            (item) =>
                item.category.id === id &&
                isSameMonth(parseISO(item.date), selectedMonth)
        );
        setFilteredTransactions(filtered);
    }, [transactions, category, selectedMonth]);

    useEffect(() => {
        if (!transactions.length) return;

        const filteredCategoryTransactions = transactions.filter(
            (item) => item.category.name === category
        );

        const groupedData = filteredCategoryTransactions.reduce((acc: Record<string, { amount: number, date: Date }>, item) => {
            const date = parseISO(item.date);
            const monthKey = format(date, 'yyyy-MM');
            if (!acc[monthKey]) {
                acc[monthKey] = { amount: 0, date };
            }
            acc[monthKey].amount += item.amount;
            return acc;
        }, {});

        const dates = Object.values(groupedData).map((item) => item.date);
        const earliestDate = dates.length > 0 ? startOfMonth(new Date(Math.min(...dates.map((d) => d.getTime())))) : startOfMonth(new Date());
        const latestDate = endOfMonth(new Date());
        let totalMonths = differenceInMonths(latestDate, earliestDate) + 1;

        if (totalMonths < 6) totalMonths = 6;

        const monthsRange = Array.from({ length: totalMonths }, (_, i) =>
            addMonths(earliestDate, i - Math.max(0, totalMonths - Object.keys(groupedData).length))
        );

        setAvailableMonths(monthsRange);

        const data = monthsRange.map((date) => {
            const monthKey = format(date, 'yyyy-MM');
            const displayLabel =
                date.getFullYear() === new Date().getFullYear()
                    ? format(date, 'MMM')
                    : format(date, "MMM''yy");
            return {
                value: groupedData[monthKey]?.amount || 0,
                label: displayLabel,
                onPress: () => setSelectedMonth(date),
                topLabelComponent: () => (
                    <View style={styles.topLabelContainer}>
                        <Text style={[styles.topLabel, { color: colors.text }]}>{`$${(groupedData[monthKey]?.amount || 0)}`}</Text>
                    </View>
                ),
            };
        });

        while (data.length < 5) {
            const lastDate = data.length > 0 ? addMonths(data[0].label, -1) : subMonths(new Date(), 1);
            data.unshift({
                value: 0,
                label: format(lastDate, 'MMM'),
                onPress: () => setSelectedMonth(lastDate),
                topLabelComponent: () => (
                    <View style={styles.topLabelContainer}>
                        <Text style={[styles.topLabel, { color: colors.text }]}>$0</Text>
                    </View>
                ),
            });
        }

        setChartData(data);
    }, [transactions, category]);

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
            <View style={{ padding: 16 }}>
                <ThemedText style={[styles.sectionTitle, { marginTop: 20 }]}>
                    Transactions for {format(selectedMonth, 'MMMM yyyy')}
                </ThemedText>
                <FlatList
                    data={filteredTransactions}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TransactionItem
                            key={item.id}
                            transaction={item}
                        />
                    )}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No transactions for this month.</Text>
                    }
                    ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
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
