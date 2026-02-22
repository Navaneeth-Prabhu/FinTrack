import { StyleSheet, Text, View, Platform, StatusBar } from 'react-native'
import React, { useMemo, useState, useLayoutEffect } from 'react'
import { useTransactionStore } from '@/stores/transactionStore';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Transaction } from '@/types';
import { FlashList } from '@shopify/flash-list';
import { TransactionItem } from '@/components/transactions/TransactionItem';
import { useTheme } from '@/hooks/useTheme';
import { BarChart } from 'react-native-gifted-charts';
import { addMonths, format, isSameMonth, isSameYear, max, min, parseISO, startOfMonth, subMonths, differenceInMonths } from 'date-fns';
import { formatLargeNumber } from '@/utils/numberUtl';
import { ThemedText } from '@/components/common/ThemedText';

const VisitedHistoryScreen = () => {

  const { id } = useLocalSearchParams();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const { transactions } = useTransactionStore();
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  useLayoutEffect(() => {
    navigation.setOptions({
      title: `Visited History`,
      headerShown: true,
    });
  }, [navigation]);

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
    const today = startOfMonth(new Date());

    if (merchantLoyaltyTransactions.length === 0) {
      // Show last 6 months as empty state to match CategoryDetails standard
      return Array.from({ length: 6 }, (_, i) => {
        const date = addMonths(subMonths(today, 5), i);
        return {
          value: 0,
          label: format(date, 'MMM'),
          frontColor: colors.accent,
          topLabelComponent: () => (
            <Text style={{ color: colors.text, fontSize: 10 }}>0</Text>
          ),
        };
      });
    }

    const transactionDates = merchantLoyaltyTransactions.map(t => parseISO(t.date));
    const earliestDataDate = startOfMonth(min(transactionDates));

    // Logic: min 6 months, or back to earliest month if further
    const monthsDiff = Math.abs(differenceInMonths(today, earliestDataDate));
    const totalMonths = Math.max(6, monthsDiff + 1);
    const startDate = subMonths(today, totalMonths - 1);

    const groupedData = merchantLoyaltyTransactions.reduce((acc: Record<string, number>, t) => {
      const date = parseISO(t.date);
      const monthKey = format(date, 'yyyy-MM');
      acc[monthKey] = (acc[monthKey] || 0) + t.amount;
      return acc;
    }, {});

    const monthsRange = Array.from({ length: totalMonths }, (_, i) => addMonths(startDate, i));

    return monthsRange.map((date) => {
      const monthKey = format(date, 'yyyy-MM');
      const label = isSameYear(date, new Date())
        ? format(date, 'MMM')
        : format(date, "MMM ''yy");

      const amount = groupedData[monthKey] || 0;
      return {
        value: amount,
        label,
        frontColor: (isSameMonth(date, selectedMonth) && isSameYear(date, selectedMonth)) ?
          (merchantLoyaltyTransactions[0]?.category?.color || colors.primary) :
          colors.accent,
        topLabelComponent: () => (
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.text, fontSize: 10 }}>
              {amount > 0 ? formatLargeNumber(amount) : '0'}
            </Text>
          </View>
        ),
        onPress: () => setSelectedMonth(date),
      };
    });
  }, [merchantLoyaltyTransactions, colors, selectedMonth]);

  const handleBarPress = (date: Date) => {
    setSelectedMonth(date);
  };


  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={{ backgroundColor: colors.card, paddingVertical: 16 }}>
        <BarChart
          data={chartData}
          barWidth={40}
          noOfSections={4}
          barBorderRadius={4}
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
          data={merchantLoyaltyTransactions}
          renderItem={({ item }) => (
            <TransactionItem
              transaction={item}
              dateFormate="MMM dd, yyyy"
            />
          )}
          keyExtractor={(item) => item.id}
          estimatedItemSize={60}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={{ paddingVertical: 16 }}>
              <ThemedText style={styles.sectionTitle}>
                All Transactions
              </ThemedText>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        />
      </View>
    </View>
  )
}

export default VisitedHistoryScreen

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  itemSeparator: {
    height: 8,
  }
})