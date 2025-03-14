import React, { useMemo, useState, useLayoutEffect, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { useBudgetStore } from '@/stores/budgetStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/common/ThemedText';
import { TransactionItem } from '@/components/transactions/TransactionItem';
import { format, addDays, subDays } from 'date-fns';

const BudgetDetailsScreen = () => {
  const { id, showHistory } = useLocalSearchParams();
  const { budgets, getCurrentPeriod, getPastPeriods, calculateSpent, lastUpdated } = useBudgetStore();
  const { transactions } = useTransactionStore();
  const { colors } = useTheme();
  const [showHistoryList, setShowHistoryList] = useState(showHistory === 'true');
  const [currentSpent, setCurrentSpent] = useState<number | null>(null);
  const [pastPeriodsData, setPastPeriodsData] = useState<{ start: Date; end: Date; spent: number }[]>([]);
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

    // Cap end date if budget has an endDate
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
      const pastPeriods = await getPastPeriods(budget);
      setCurrentSpent(spent);
      setPastPeriodsData(pastPeriods);
    } catch (error) {
      console.error('Error fetching budget data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update data when budget, transactions, or period offset changes
  useEffect(() => {
    fetchBudgetData();
  }, [budget, lastUpdated, transactions, periodOffset]);

  // Set navigation options
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
  const progress = currentSpent !== null ? (currentSpent / budget.limit) * 100 : null;

  const periodTransactions = useMemo(() => {
    return transactions.filter(t =>
      t.type === 'expense' &&
      t.category.id === budget.category.id &&
      new Date(t.date) >= displayedPeriod.start &&
      new Date(t.date) <= displayedPeriod.end
    );
  }, [transactions, budget, displayedPeriod]);

  const renderHistoryItem = ({ item }: { item: { start: Date; end: Date; spent: number } }) => (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => {
        console.log(`Viewing period: ${format(item.start, 'MMM d')} - ${format(item.end, 'MMM d')}`);
      }}
    >
      <ThemedText>
        {format(item.start, 'MMM d')} - {format(item.end, 'MMM d')}
      </ThemedText>
      <ThemedText>${item.spent.toFixed(2)} / ${budget.limit.toFixed(2)}</ThemedText>
    </TouchableOpacity>
  );

  const handlePrevPeriod = () => setPeriodOffset(prev => prev - 1);
  const handleNextPeriod = () => {
    // Prevent going beyond current period for recurring budgets, or endDate for non-recurring
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
            <ThemedText>
              {format(displayedPeriod.start, 'MMM d')} - {format(displayedPeriod.end, 'MMM d')}
            </ThemedText>
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
              <ThemedText>Progress: ${progress?.toFixed(1) ?? 'N/A'}%</ThemedText>
            </View>
          )}

          <TouchableOpacity
            style={styles.historyToggle}
            onPress={() => setShowHistoryList(!showHistoryList)}
          >
            <ThemedText>{showHistoryList ? 'Hide History' : 'Show History'}</ThemedText>
            <FontAwesome name={showHistoryList ? 'chevron-up' : 'chevron-down'} size={14} color={colors.text} />
          </TouchableOpacity>

          {showHistoryList && (
            <FlatList
              data={pastPeriodsData}
              renderItem={renderHistoryItem}
              keyExtractor={item => `${item.start.toISOString()}-${item.end.toISOString()}`}
              style={styles.historyList}
            />
          )}
        </View>

        <View style={styles.transactionsContainer}>
          <ThemedText style={styles.sectionTitle}>Transactions</ThemedText>
          {periodTransactions.length > 0 ? (
            periodTransactions.map(transaction => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))
          ) : (
            <ThemedText>No transactions in this period</ThemedText>
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
  historyToggle: { flexDirection: 'row', justifyContent: 'space-between', padding: 10 },
  historyList: { maxHeight: 200 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  transactionsContainer: { padding: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
});

export default BudgetDetailsScreen;