import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { useBudgetStore } from '@/stores/budgetStore';
import { ThemedText } from '@/components/common/ThemedText';

// Make sure this matches your actual type
interface BudgetDisplayData {
  budget: any; // Replace with your Budget type
  start: Date;
  end: Date;
  spent: number;
  progress: number;
}

// Define the styles object
const styles = {
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold' as const,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  emptyText: {
    textAlign: 'center' as const,
  },
  budgetList: {
    flex: 1,
  },
  budgetItem: {
    marginBottom: 16,
  },
  budgetCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  historyButton: {
    backgroundColor: '#E0E0E0',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center' as const,
  },
  historyButtonText: {
    color: '#007AFF',
  },
};

function BudgetScreen() {
  const { budgets, fetchBudgets, getCurrentPeriod, calculateSpent, lastUpdated } = useBudgetStore();
  const [budgetData, setBudgetData] = useState<BudgetDisplayData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isFetching = useRef(false);
  const hasInitialFetch = useRef(false);

  const fetchBudgetData = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetching.current) {
      console.log('Already fetching, skipping duplicate request');
      return;
    }

    console.log('Fetching budget data...');
    isFetching.current = true;
    setIsLoading(true);

    try {
      // Only fetch budgets if we don't already have them
      if (budgets.length === 0 && !hasInitialFetch.current) {
        console.log('No budgets loaded, fetching from DB first');
        await fetchBudgets();
        hasInitialFetch.current = true;
      }

      // Process budgets for display
      const data = await Promise.all(
        budgets.map(async (budget) => {
          const { start, end } = getCurrentPeriod(budget);
          const spent = await calculateSpent(budget, start, end);
          const progress = (spent / budget.limit) * 100;
          return { budget, start, end, spent, progress };
        })
      );

      setBudgetData(data);
      console.log('Budget data processed:', data.length, 'budgets');
    } catch (error) {
      console.error('Error fetching budget data:', error);
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [budgets, getCurrentPeriod, calculateSpent, fetchBudgets]);

  // Initial fetch on mount
  useEffect(() => {
    if (!hasInitialFetch.current) {
      console.log('Component mounted, starting initial fetch');
      fetchBudgetData();
    }

    // Cleanup on unmount
    return () => {
      console.log('Component unmounted, cleanup');
      isFetching.current = false;
    };
  }, [fetchBudgetData]);

  // Re-calculate budget data when lastUpdated changes (due to transaction changes)
  useEffect(() => {
    if (lastUpdated && hasInitialFetch.current && !isFetching.current) {
      console.log('Budget data update detected, refreshing display data');
      fetchBudgetData();
    }
  }, [lastUpdated, fetchBudgetData]);

  // Handle screen focus with proper debouncing
  useFocusEffect(
    useCallback(() => {
      console.log('Screen focused');

      // Only refresh data on focus if we're not currently fetching
      if (!isFetching.current) {
        console.log('Screen focused, refreshing data');
        const timeout = setTimeout(() => {
          fetchBudgets().then(() => fetchBudgetData());
        }, 300); // Debounce time

        return () => {
          console.log('Screen unfocused, clearing timeout');
          clearTimeout(timeout);
        };
      }

      return () => {
        console.log('Screen unfocused');
      };
    }, [fetchBudgets, fetchBudgetData])
  );

  console.log('Rendering BudgetScreen, budgets count:', budgets.length);

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
          {budgetData.map(({ budget, start, end, spent, progress }) => (
            <View key={budget.id} style={styles.budgetItem}>
              <TouchableOpacity onPress={() => router.push(`/budget/${budget.id}`)}>
                <View style={styles.budgetCard}>
                  <ThemedText>{budget.name || budget.category.name}</ThemedText>
                  <ThemedText>
                    {format(start, 'MMM d')} - {format(end, 'MMM d')}
                  </ThemedText>
                  <ThemedText>${spent.toFixed(2)} / ${budget.limit.toFixed(2)}</ThemedText>
                  <ThemedText>{progress.toFixed(1)}% used</ThemedText>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.historyButton}
                onPress={() =>
                  router.push({ pathname: '/budget/[id]', params: { id: budget.id, showHistory: 'true' } })
                }
              >
                <ThemedText style={styles.historyButtonText}>View History</ThemedText>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

export default BudgetScreen;