import { StyleSheet, Text, View } from 'react-native'
import React, { useMemo, useState } from 'react'
import { useTransactionStore } from '@/stores/transactionStore';
import { useLocalSearchParams, useSearchParams } from 'expo-router/build/hooks';
import { Transaction } from '@/types';
import { FlatList } from 'react-native-gesture-handler';
import { TransactionItem } from '@/components/transactions/TransactionItem';
import { useTheme } from '@/hooks/useTheme';
import { BarChart } from 'react-native-gifted-charts';
import { addMonths, format, isSameMonth, isSameYear, max, min, parseISO, startOfMonth } from 'date-fns';
import { formatLargeNumber } from '@/utils/numberUtl';

const VisitedHistoryScreen = () => {

  const { id } = useLocalSearchParams();
  const { colors } = useTheme();
  const { transactions } = useTransactionStore();
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  const transaction = useMemo(() => transactions.find(t => t.id === id), [id, transactions]);
  const merchantLoyaltyTransactions = useMemo(() => {
    // If paidTo or paidBy indicates 'Unknown', return an empty array immediately
    // if (
    //   transaction?.paidBy?.trim().toLowerCase() === 'Unknown Payer' ||
    //   transaction?.paidTo?.trim().toLowerCase() === 'Unknown Recipient'
    // ) {
    //   return [];
    // }

    // Otherwise, return all matching transactions
    // return transactions.filter((t: Transaction) => t.category.name === transaction?.category.name);
    return transactions.filter((t: Transaction) => t.paidTo === transaction?.paidTo);
  }, [transactions, transaction]);

  const chartData = useMemo(() => {
    if (merchantLoyaltyTransactions.length === 0) return [];

    const dates = merchantLoyaltyTransactions.map(t => parseISO(t.date));
    const earliestDate = startOfMonth(min(dates));
    const latestDate = max([max(dates), new Date()]);
    const currentYear = new Date().getFullYear();

    let monthlyData: { [key: string]: { total: number; count: number } } = {};
    let currentMonth = earliestDate;

    while (currentMonth <= latestDate) {
      const monthKey = format(currentMonth, 'yyyy-MM');
      monthlyData[monthKey] = { total: 0, count: 0 };
      currentMonth = addMonths(currentMonth, 1);
    }

    merchantLoyaltyTransactions.forEach(t => {
      const date = parseISO(t.date);
      const monthKey = format(date, 'yyyy-MM');
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].total += t.amount;
        monthlyData[monthKey].count += 1;
      }
    });

    return Object.entries(monthlyData).map(([monthKey, data]) => {
      const date = parseISO(monthKey + '-01');
      const label = isSameYear(date, new Date(currentYear, 0, 1))
        ? format(date, 'MMM')
        : format(date, "MMM ''yy");

      return {
        value: data.total,
        label,
        frontColor: isSameMonth(date, selectedMonth) ?
          merchantLoyaltyTransactions[0].category.color :
          colors.accent,
        topLabelComponent: () => (
          <Text style={{ color: colors.text, fontSize: 10 }}>
            ${formatLargeNumber(data.total)}
          </Text>
        ),
        onPress: () => handleBarPress(date),
      };
    });
  }, [merchantLoyaltyTransactions, colors, selectedMonth]);

  const handleBarPress = (date: Date) => {
    setSelectedMonth(date);
  };


  console.log(merchantLoyaltyTransactions, 'merchantLoyaltyScoremerchantLoyaltyScore');
  return (
    <View style={{ flex: 1, paddingHorizontal: 16, backgroundColor: colors.background }}>
      <Text>VisitedHistoryScreen</Text>
      <BarChart
        data={chartData}
        barWidth={45}
        spacing={10}
        noOfSections={3}
        barBorderRadius={4}
        autoShiftLabels={true}
        showYAxisIndices={false}
        yAxisTextStyle={{ color: colors.text }}
        xAxisLabelTextStyle={{ color: colors.text, fontSize: 12 }}
        hideYAxisText={true}
        yAxisThickness={0}
        xAxisThickness={0}
        showXAxisIndices={false}
        hideRules
        isAnimated
        scrollToEnd
        animationDuration={800}
        initialSpacing={0}
      />
      <FlatList
        data={merchantLoyaltyTransactions}
        renderItem={({ item }) => (
          <View style={{
            // backgroundColor: colors.card,
            paddingHorizontal: 4,
            paddingVertical: 4,
          }}>
            <TransactionItem
              transaction={item}
            // isUpcoming={section.isUpcoming}
            />
          </View>
        )}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={() => <Text>Visited History</Text>}
      />
    </View>
  )
}

export default VisitedHistoryScreen

const styles = StyleSheet.create({
  list: {
    padding: 10,
    backgroundColor: 'red',
  }
})