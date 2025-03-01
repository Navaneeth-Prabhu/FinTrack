import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Budget, Transaction } from '@/types';
import { format, isBefore, isAfter, parseISO, addDays, differenceInDays } from 'date-fns';
import { useBudgetStore } from '@/stores/budgetStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { FontAwesome } from '@expo/vector-icons';
import { getEndDateForFrequency, getNextPeriodEndDate } from '@/utils/date';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/common/ThemedText';
import { TransactionItem } from '@/components/transactions/TransactionItem';

const BudgetDetailsScreen = () => {
  const { id } = useLocalSearchParams();
  const { budgets, isLoading: budgetsLoading } = useBudgetStore();
  const { transactions, isLoading: transactionsLoading } = useTransactionStore();
  const { colors } = useTheme()
  // Find the budget by ID
  const budget = useMemo(() => {
    const found = budgets.find(b => b.id === (typeof id === 'string' ? id : String(id)));
    if (!found) console.log('No budget found for ID:', id);
    return found;
  }, [budgets, id]);

  if (budgetsLoading || transactionsLoading || !budget) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <ThemedText>{budgetsLoading || transactionsLoading ? 'Loading...' : 'Budget not found'}</ThemedText>
      </View>
    );
  }

  // Initialize selected period
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const startDate = parseISO(budget.startDate);
    const now = new Date();
    let periodStart = startDate;
    let periodEnd = getEndDateForFrequency(budget.startDate, budget.frequency);

    // Adjust to current period if budget has started
    if (!isBefore(now, startDate)) {
      while (isBefore(getNextPeriodEndDate(periodStart.toISOString(), budget.frequency), now)) {
        periodStart = parseISO(getNextPeriodEndDate(periodStart.toISOString(), budget.frequency).toISOString());
        periodEnd = getEndDateForFrequency(periodStart.toISOString(), budget.frequency);
      }
    }

    console.log('Initial period:', { start: periodStart, end: periodEnd });
    return { start: periodStart, end: periodEnd };
  });

  // Filter transactions
  const periodTransactions = useMemo(() => {
    return transactions.filter(t =>
      t.type === 'expense' &&
      t.category.id === budget.category.id &&
      new Date(t.date).getTime() >= selectedPeriod.start.getTime() &&
      new Date(t.date).getTime() <= selectedPeriod.end.getTime()
    );
  }, [transactions, budget, selectedPeriod]);

  // Calculate total spent
  const totalSpent = useMemo(() =>
    periodTransactions.reduce((sum, t) => sum + t.amount, 0),
    [periodTransactions]
  );

  // Navigation restrictions
  const canGoBack = useMemo(() => {
    const prevStart = parseISO(addDays(selectedPeriod.start, -1).toISOString());
    return !isBefore(prevStart, parseISO(budget.startDate));
  }, [selectedPeriod, budget]);

  const canGoForward = useMemo(() => {
    const nextEnd = getNextPeriodEndDate(selectedPeriod.end.toISOString(), budget.frequency);
    return !isAfter(nextEnd, new Date());
  }, [selectedPeriod, budget]);

  // Navigate period
  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && !canGoBack) return;
    if (direction === 'next' && !canGoForward) return;

    setSelectedPeriod(prev => {
      let newStart, newEnd;
      if (direction === 'prev') {
        newEnd = addDays(prev.start, -1);
        newStart = addDays(newEnd, -(differenceInDays(prev.end, prev.start)));
      } else {
        newStart = addDays(prev.end, 1);
        newEnd = getEndDateForFrequency(newStart.toISOString(), budget.frequency);
      }
      console.log('Navigated period:', { start: newStart, end: newEnd });
      return { start: newStart, end: newEnd };
    });
  };

  // Format date range
  const dateRangeText = useMemo(() => {
    const start = format(selectedPeriod.start, 'MMM d');
    const end = budget.frequency === 'daily' ? '' : ` - ${format(selectedPeriod.end, 'MMM d')}`;
    return `${start}${end}`;
  }, [selectedPeriod, budget.frequency]);

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    return budget.limit === 0 ? 0 : Math.min((totalSpent / budget.limit) * 100, 100);
  }, [totalSpent, budget]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={[styles.categoryHeader]}>
          <ThemedText style={[styles.categoryIcon, { backgroundColor: budget.category.color }]}>
            {budget.category.icon}
          </ThemedText>
          <ThemedText variant='h2'>{budget.category.name} Budget</ThemedText>
        </View>
        <ThemedText style={styles.subtitle}>
          Spent: ${totalSpent.toFixed(2)} / Limit: ${budget.limit.toFixed(2)}
        </ThemedText>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              { width: `${progressPercentage}%`, backgroundColor: budget.category.color },
            ]}
          />
        </View>
        <ThemedText style={styles.progress}>
          Progress: {progressPercentage.toFixed(1)}%
        </ThemedText>
      </View>

      <FlatList
        data={periodTransactions}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TransactionItem
            transaction={item}
          // isUpcoming={section.isUpcoming}
          />
        )}
        ListEmptyComponent={<ThemedText style={styles.emptyText}>No transactions in this period</ThemedText>}
        contentContainerStyle={styles.listContent}
      />

      <View style={[styles.footer, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          onPress={() => navigatePeriod('prev')}
          style={[styles.arrowButton, !canGoBack && styles.disabledButton]}
          disabled={!canGoBack}
        >
          <FontAwesome name="angle-left" size={24} color={canGoBack ? colors.accent : '#ccc'} />
        </TouchableOpacity>
        <ThemedText style={styles.dateRange}>{dateRangeText}</ThemedText>
        <TouchableOpacity
          onPress={() => navigatePeriod('next')}
          style={[styles.arrowButton, !canGoForward && styles.disabledButton]}
          disabled={!canGoForward}
        >
          <FontAwesome name="angle-right" size={24} color={canGoForward ? colors.accent : '#ccc'} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    fontSize: 20,
    textAlign: 'center',
    textAlignVertical: 'center',
    overflow: 'hidden',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  progress: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },
  listContent: {
    padding: 10,
    paddingBottom: 80,
  },
  transactionItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  transactionDate: {
    fontSize: 14,
    color: '#888',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 5,
  },
  transactionNote: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 16,
    padding: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  arrowButton: {
    padding: 10,
  },
  disabledButton: {
    opacity: 0.5,
  },
  dateRange: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default BudgetDetailsScreen;