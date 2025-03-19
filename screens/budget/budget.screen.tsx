import React, { useCallback, useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useBudgetStore } from '@/stores/budgetStore';
import { ThemedText } from '@/components/common/ThemedText';
import { router, useFocusEffect } from 'expo-router';
import { BudgetCard } from '@/components/BudgetCard'; // Import BudgetCard
import { Budget } from '@/types';

export interface BudgetDisplayData {
  budget: Budget;
  start: Date;
  end: Date;
  spent: number;
  progress: number;
}

function BudgetScreen() {
  const { budgets, fetchBudgets, getCurrentPeriod, calculateSpent, lastUpdated } = useBudgetStore();
  const [budgetData, setBudgetData] = useState<BudgetDisplayData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isFetching = useRef(false);
  const hasInitialFetch = useRef(false);

  const fetchBudgetData = useCallback(async () => {
    if (isFetching.current) {
      console.log('Already fetching, skipping duplicate request');
      return;
    }

    isFetching.current = true;
    setIsLoading(true);

    try {
      if (budgets.length === 0 && !hasInitialFetch.current) {
        await fetchBudgets();
        hasInitialFetch.current = true;
      }

      const data = await Promise.all(
        budgets.map(async (budget) => {
          const { start, end } = getCurrentPeriod(budget);
          const spent = await calculateSpent(budget, start, end);
          const progress = (spent / budget.limit) * 100;
          return { budget, start, end, spent, progress };
        })
      );

      setBudgetData(data);
    } catch (error) {
      console.error('Error fetching budget data:', error);
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [budgets, getCurrentPeriod, calculateSpent, fetchBudgets]);

  useEffect(() => {
    if (!hasInitialFetch.current) {
      fetchBudgetData();
    }
    return () => {
      isFetching.current = false;
    };
  }, [fetchBudgetData]);

  useEffect(() => {
    if (lastUpdated && hasInitialFetch.current && !isFetching.current) {
      fetchBudgetData();
    }
  }, [lastUpdated, fetchBudgetData]);

  useFocusEffect(
    useCallback(() => {
      if (!isFetching.current) {
        const timeout = setTimeout(() => {
          fetchBudgets().then(() => fetchBudgetData());
        }, 300);

        return () => {
          clearTimeout(timeout);
        };
      }
      return () => {
      };
    }, [fetchBudgets, fetchBudgetData])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>My Budgets</ThemedText>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/budget/budgetForm')}
        >
          <ThemedText style={styles.addButtonText}>Add Budget</ThemedText>
        </TouchableOpacity>
      </View>

      {isLoading && budgetData.length === 0 ? (
        <View style={styles.emptyState}>
          <ThemedText>Loading budgets...</ThemedText>
        </View>
      ) : budgets.length === 0 ? (
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyText}>
            No budgets yet. Create your first budget to start tracking expenses.
          </ThemedText>
        </View>
      ) : (
        <ScrollView style={styles.budgetList}>
          {budgetData.map(({ budget, start, spent, progress }) => (
            <BudgetCard
              key={budget.id}
              budget={{ ...budget, spent, progress, startDate: start.toISOString() }}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: { fontSize: 24, fontWeight: 'bold' },
  addButton: { backgroundColor: '#8A3FFC', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: 'white', fontWeight: '600' },
  budgetList: { flex: 1, paddingHorizontal: 16 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { textAlign: 'center', fontSize: 16, color: '#666' },
});

export default BudgetScreen;