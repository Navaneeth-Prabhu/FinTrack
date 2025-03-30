import React, { useMemo, useState, useLayoutEffect, useEffect } from 'react';
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

  if (!budget || !currentPeriod || !displayedPeriod) {
    return (
      <View style={styles.loadingContainer}>
        <ThemedText>Budget not found</ThemedText>
      </View>
    );
  }

  const remaining = currentSpent !== null ? budget.limit - currentSpent : null;
  const progress = currentSpent !== null ? (currentSpent / budget.limit) * 100 : 0;

  const periodTransactions = useMemo(() => {
    return transactions.filter(t =>
      t.type === 'expense' &&
      t.category.id === budget.category.id &&
      new Date(t.date) >= displayedPeriod.start &&
      new Date(t.date) <= displayedPeriod.end
    );
  }, [transactions, budget, displayedPeriod]);

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

  // Chart data for transactions
  const chartData = periodTransactions.map(t => ({
    value: Math.abs(t.amount),
    label: format(new Date(t.date), 'd'),
    frontColor: colors.primary,
  }));

  const handlePrevPeriod = () => setPeriodOffset(prev => prev - 1);
  const handleNextPeriod = () => {
    if (budget.isRecurring && periodOffset >= 0) return;
    if (!budget.isRecurring && budget.endDate && displayedPeriod.end >= new Date(budget.endDate)) return;
    setPeriodOffset(prev => prev + 1);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView>
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <ThemedText variant="h2">{budget.name || budget.category.name} Budget</ThemedText>
          <View style={styles.periodNavigation}>
            <TouchableOpacity onPress={handlePrevPeriod} style={styles.arrowButton}>
              <FontAwesome name="chevron-left" size={16} color={colors.text} />
            </TouchableOpacity>
            <ThemedText>{formatPeriodDisplay()}</ThemedText>
            <TouchableOpacity onPress={handleNextPeriod} style={styles.arrowButton}>
              <FontAwesome name="chevron-right" size={16} color={colors.text} />
            </TouchableOpacity>
          </View>
          {isLoading ? (
            <ThemedText>Loading budget details...</ThemedText>
          ) : (
            <View style={styles.summary}>
              <ThemedText>Spent: ${currentSpent?.toFixed(2) ?? 'N/A'}</ThemedText>
              <ThemedText>Limit: ${budget.limit.toFixed(2)}</ThemedText>
              <ThemedText>Remaining: ${remaining?.toFixed(2) ?? 'N/A'}</ThemedText>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${Math.min(progress, 100)}%`,
                      backgroundColor: progress > 100 ? colors.error : colors.primary,
                    },
                  ]}
                />
              </View>
              <ThemedText>Progress: ${progress.toFixed(1)}%</ThemedText>
            </View>
          )}
        </View>

        <View style={styles.transactionsContainer}>
          <ThemedText style={styles.sectionTitle}>Transactions</ThemedText>
          {periodTransactions.length > 0 ? (
            <>
              <BarChart
                data={chartData}
                width={screenWidth - 40} // Adjust for padding
                height={220}
                barWidth={30}
                spacing={10}
                noOfSections={5}
                barBorderRadius={4}
                frontColor={colors.primary}
                yAxisTextStyle={{ color: colors.text }}
                xAxisLabelTextStyle={{ color: colors.text }}
                yAxisLabelPrefix="$"
                backgroundColor={colors.card}
                rulesColor={colors.text}
                showLine={false}
                // style={styles.chart}
              />
              {periodTransactions.map(transaction => (
                <TransactionItem key={transaction.id} transaction={transaction} />
              ))}
            </>
          ) : (
            <ThemedText style={{color: colors.subtitle}}>No transactions in this period</ThemedText>
          )}
        </View>
      </ScrollView>
    </View>
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
    marginVertical: 10,
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
  chart: { marginVertical: 15, borderRadius: 8 },
});

export default BudgetDetailsScreen;