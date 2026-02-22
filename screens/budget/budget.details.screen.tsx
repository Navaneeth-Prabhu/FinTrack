import React, { useMemo, useState, useLayoutEffect, useEffect } from 'react';
import { BudgetCard } from '@/components/BudgetCard';
import { View, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { useBudgetStore } from '@/stores/budgetStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/common/ThemedText';
import { TransactionItem } from '@/components/transactions/TransactionItem';
import { format, addDays, subDays } from 'date-fns';
import { BarChart } from 'react-native-gifted-charts';
import { CategoryIcon } from '@/components/transactions/CategoryIcon';
import { fontSizes, tokens } from '@/constants/theme';
import CustomLineChart from '@/components/charts/CustomLineChart';

const screenWidth = Dimensions.get('window').width;

const BudgetDetailsScreen = () => {
  const { id } = useLocalSearchParams();
  const { budgets, getCurrentPeriod, calculateSpent, lastUpdated } = useBudgetStore();
  const { transactions } = useTransactionStore();
  const { colors } = useTheme();
  const [currentSpent, setCurrentSpent] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [periodOffset, setPeriodOffset] = useState(0); // 0 = current, -1 = previous, 1 = next, etc.
  const navigation = useNavigation();

  const budget = budgets.find(b => b.id === (typeof id === 'string' ? id : String(id)));
  const currentPeriod = budget ? getCurrentPeriod(budget) : null;

  // Calculate the displayed period based on offset
  const getDisplayedPeriod = () => {
    if (!budget || !currentPeriod) return null;
    const { start: baseStart, end: baseEnd } = currentPeriod;
    let periodStart = new Date(baseStart);
    let periodEnd = new Date(baseEnd);

    if (budget.frequency === 'custom' && budget.periodLength) {
      const shiftDays = budget.periodLength * periodOffset;
      periodStart = addDays(baseStart, shiftDays);
      periodEnd = addDays(periodStart, budget.periodLength - 1);
    } else {
      switch (budget.frequency) {
        case 'daily':
          periodStart = addDays(baseStart, periodOffset);
          periodEnd = periodStart;
          break;
        case 'weekly':
          periodStart = addDays(baseStart, periodOffset * 7);
          periodEnd = addDays(periodStart, 6);
          break;
        case 'monthly':
          periodStart = new Date(baseStart.getFullYear(), baseStart.getMonth() + periodOffset, 1);
          periodEnd = new Date(baseStart.getFullYear(), baseStart.getMonth() + periodOffset + 1, 0);
          break;
        case 'yearly':
          periodStart = new Date(baseStart.getFullYear() + periodOffset, 0, 1);
          periodEnd = new Date(baseStart.getFullYear() + periodOffset, 11, 31);
          break;
      }
    }

    if (budget.endDate && periodEnd > new Date(budget.endDate)) {
      periodEnd = new Date(budget.endDate);
    }

    return { start: periodStart, end: periodEnd };
  };

  const displayedPeriod = getDisplayedPeriod();

  // Fetch budget data for the displayed period
  const fetchBudgetData = async () => {
    if (!budget || !displayedPeriod) return;
    setIsLoading(true);
    try {
      const spent = await calculateSpent(budget, displayedPeriod.start, displayedPeriod.end);
      setCurrentSpent(spent);
    } catch (error) {
      console.error('Error fetching budget data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgetData();
  }, [budget, lastUpdated, transactions, periodOffset]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/budget/budgetForm', params: { editMode: 'true', budgetId: budget?.id } })}
            style={{ marginRight: 15 }}
          >
            <Ionicons name="pencil" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (budget) {
                useBudgetStore.getState().removeBudget(budget.id);
                router.back();
              }
            }}
            style={{ marginRight: 15 }}
          >
            <Ionicons name="trash-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </>
      ),
    });
  }, [navigation, budget, colors.text]);

  const periodTransactions = useMemo(() => {
    if (!budget || !displayedPeriod) return [];
    return transactions.filter(t =>
      t.type === 'expense' &&
      t.category.id === budget.category.id &&
      new Date(t.date) >= displayedPeriod.start &&
      new Date(t.date) <= displayedPeriod.end
    );
  }, [transactions, budget, displayedPeriod]);

  const chartData = useMemo(() => {
    if (!periodTransactions.length || !currentPeriod || !budget) return [];

    // Group transactions by date and sum them
    const groupedByDate: Record<string, number> = {};

    periodTransactions.forEach(transaction => {
      const dateStr = format(new Date(transaction.date), 'd');

      if (!groupedByDate[dateStr]) {
        groupedByDate[dateStr] = 0;
      }

      groupedByDate[dateStr] += Math.abs(transaction.amount);
    });

    // Determine the spending cutoff date (for value1)
    const today = new Date();
    const lastTransactionDate = new Date(Math.max(...periodTransactions.map(t => new Date(t.date).getTime())));
    const spendingCutoffDate = new Date(Math.min(
      Math.max(today.getTime(), lastTransactionDate.getTime()),
      currentPeriod.end.getTime()
    ));

    // Create array for the full period (for budget line)
    const allDays = [];
    const startDate = currentPeriod.start;
    const endDate = currentPeriod.end;
    let currentDate = startDate;

    // Calculate budget values
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const budgetLimit = budget.limit;
    const dailyIncrement = budgetLimit / totalDays;
    let dayCount = 0;
    let cumulativeExpenses = 0;

    while (currentDate <= endDate) {
      const day = format(currentDate, 'd');
      dayCount++;

      // Add today's expenses to cumulative total (only if within spending cutoff)
      const todayExpenses = groupedByDate[day] || 0;
      if (currentDate <= spendingCutoffDate) {
        cumulativeExpenses += todayExpenses;
      }

      allDays.push({
        label: day,
        // Show spending value only up to cutoff date, null afterwards
        value: currentDate <= spendingCutoffDate ? cumulativeExpenses : null,
        // Budget line continues for full period
        value2: dailyIncrement * dayCount
      });

      // Move to next day
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return allDays;
  }, [periodTransactions, currentPeriod, budget]);

  if (!budget || !currentPeriod || !displayedPeriod) {
    return (
      <View style={styles.loadingContainer}>
        <ThemedText>Budget not found</ThemedText>
      </View>
    );
  }

  const remaining = currentSpent !== null ? budget.limit - currentSpent : null;
  const progress = currentSpent !== null ? (currentSpent / budget.limit) * 100 : 0;

  // Format period display based on frequency
  const formatPeriodDisplay = () => {
    if (budget.frequency === 'daily') {
      return format(displayedPeriod.start, 'd MMM');
    } else if (budget.frequency === 'yearly') {
      return format(displayedPeriod.start, 'yyyy');
    } else {
      return `${format(displayedPeriod.start, 'd MMM')} - ${format(displayedPeriod.end, 'd MMM')}`;
    }
  };

  const handlePrevPeriod = () => setPeriodOffset(prev => prev - 1);
  const handleNextPeriod = () => {
    if (budget.isRecurring && periodOffset >= 0) return;
    if (!budget.isRecurring && budget.endDate && displayedPeriod.end >= new Date(budget.endDate)) return;
    setPeriodOffset(prev => prev + 1);
  };

  return (
    <>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          {/* <ThemedText variant="h2">{budget.name || budget.category.name}</ThemedText> */}
          {isLoading ? (
            <ThemedText>Loading budget details...</ThemedText>
          ) : (
            <>
              <BudgetCard
                key={budget.id}
                budget={{ ...budget, spent: currentSpent ?? 0, progress, startDate: displayedPeriod.start.toISOString() }}
              />
            </>
          )}
        </View>

        <View style={styles.transactionsContainer}>
          <ThemedText style={styles.sectionTitle}>Budget Progress</ThemedText>
          {chartData.length > 0 &&
            <View style={{ ...styles.chart, backgroundColor: colors.card }}>
              <CustomLineChart
                data={chartData}
                secondLineColor="#FF5555"
                lineColor="#7269E3"
                gradientColors={["#8F85FF", "#6E88F720"]}
                chartHeight={270}
                yLabelCount={5}
                curved={true}
                showDots={true}
                animate={true}
                labelColor={colors.subtitle}
              />
            </View>
          }
          <ThemedText style={styles.sectionTitle}>Transactions</ThemedText>
          {periodTransactions.length > 0 ? (
            <>

              {periodTransactions.map(transaction => (
                <TransactionItem key={transaction.id} transaction={transaction} />
              ))}
            </>
          ) : (
            <ThemedText style={{ color: colors.subtitle }}>No transactions in this period</ThemedText>
          )}
        </View>
      </ScrollView>
      <View style={styles.periodNavigation}>
        <TouchableOpacity onPress={handlePrevPeriod} style={styles.arrowButton}>
          <FontAwesome name="chevron-left" size={16} color={colors.text} />
        </TouchableOpacity>
        <ThemedText>{formatPeriodDisplay()}</ThemedText>
        <TouchableOpacity onPress={handleNextPeriod} style={styles.arrowButton}>
          <FontAwesome name="chevron-right" size={16} color={colors.text} />
        </TouchableOpacity>
      </View>
    </>

  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 15 },
  periodNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 30
  },
  arrowButton: {
    padding: 10,
  },
  summary: { marginVertical: 10 },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
    marginVertical: 5,
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  transactionsContainer: { padding: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  chart: { marginBottom: 15, borderRadius: 8 },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});

export default BudgetDetailsScreen;