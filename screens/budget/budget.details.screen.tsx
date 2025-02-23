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
import { format, add, sub, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { useBudgetStore } from '@/stores/budgetStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { FontAwesome } from '@expo/vector-icons';

const BudgetDetailsScreen = () => {
  const { id } = useLocalSearchParams(); // Budget ID from navigation
  const { budgets, isLoading: budgetsLoading } = useBudgetStore();
  const { transactions, isLoading: transactionsLoading } = useTransactionStore();

  // Find the budget by ID
  const budget = useMemo(() => budgets.find(b => b.id === id as string), [budgets, id]) as Budget;

  // State for the selected period
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    switch (budget?.frequency) {
      case 'daily':
        return { start: now, end: now };
      case 'weekly':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'monthly':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'yearly':
        return { start: startOfYear(now), end: endOfYear(now) };
      default:
        return { start: now, end: now };
    }
  });

  // Filter transactions for the selected period and budget category
  const periodTransactions = useMemo(() => {
    if (!budget) return [];
    return transactions.filter(t =>
      t.type === 'expense' &&
      t.category.id === budget.category.id &&
      new Date(t.date).getTime() >= new Date(selectedPeriod.start).getTime() &&
      new Date(t.date).getTime() <= new Date(selectedPeriod.end).getTime()
    );
  }, [transactions, budget, selectedPeriod]);

  // Calculate total spent in the current period
  const totalSpent = useMemo(() =>
    periodTransactions.reduce((sum, t) => sum + t.amount, 0),
    [periodTransactions]
  );

  // Navigate to previous/next period based on frequency
  const navigatePeriod = (direction: 'prev' | 'next') => {
    const delta = direction === 'prev' ? sub : add;
    const amount = budget?.frequency === 'daily'
      ? { days: 1 }
      : budget?.frequency === 'weekly'
      ? { weeks: 1 }
      : budget?.frequency === 'monthly'
      ? { months: 1 }
      : { years: 1 };

    setSelectedPeriod(prev => {
      const newStart = delta(prev.start, amount);
      const newEnd = budget?.frequency === 'daily'
        ? newStart
        : budget?.frequency === 'weekly'
        ? endOfWeek(newStart, { weekStartsOn: 1 })
        : budget?.frequency === 'monthly'
        ? endOfMonth(newStart)
        : endOfYear(newStart);
      return { start: newStart, end: newEnd };
    });
  };

  // Format date range for display
  const dateRangeText = useMemo(() => {
    const start = format(selectedPeriod.start, 'MMM d, yyyy');
    const end = budget?.frequency === 'daily'
      ? ''
      : ` - ${format(selectedPeriod.end, 'MMM d, yyyy')}`;
    return `${start}${end}`;
  }, [selectedPeriod, budget?.frequency]);

  if (budgetsLoading || transactionsLoading || !budget) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Budget Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{budget.category.name} Budget</Text>
        <Text style={styles.subtitle}>
          Spent: ${totalSpent.toFixed(2)} / Limit: ${budget.limit.toFixed(2)}
        </Text>
        <Text style={styles.progress}>
          Progress: {((totalSpent / budget.limit) * 100).toFixed(1)}%
        </Text>
      </View>

      {/* Transactions List */}
      <FlatList
        data={periodTransactions}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.transactionItem}>
            <Text style={styles.transactionDate}>{format(new Date(item.date), 'MMM d, yyyy')}</Text>
            <Text style={styles.transactionAmount}>${item.amount.toFixed(2)}</Text>
            <Text style={styles.transactionNote}>{item.note || 'No note'}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No transactions in this period</Text>}
        contentContainerStyle={styles.listContent}
      />

      {/* Period Navigation Footer */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={() => navigatePeriod('prev')} style={styles.arrowButton}>
        <FontAwesome name="angle-left" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.dateRange}>{dateRangeText}</Text>
        <TouchableOpacity onPress={() => navigatePeriod('next')} style={styles.arrowButton}>
        <FontAwesome name="angle-right" size={24} color="black" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  progress: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },
  listContent: {
    padding: 10,
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
    color: '#333',
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
  dateRange: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
});

export default BudgetDetailsScreen;