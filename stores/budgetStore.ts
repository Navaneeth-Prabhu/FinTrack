import { create } from 'zustand';
import { Budget, Transaction } from '@/types';
import {
  fetchBudgetsFromDB,
  saveBudgetToDB,
  updateBudgetInDB,
  deleteBudgetFromDB,
  calculateBudgetSpent,
} from '@/db/repository/budgetRepository';
import { calculatePeriodStart, calculatePeriodEnd } from '@/utils/date';

type TransactionAction = 'add' | 'update' | 'remove';

interface BudgetStore {
  budgets: Budget[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;

  // Core budget operations
  fetchBudgets: () => Promise<void>;
  saveBudget: (budget: Budget) => Promise<Budget>;
  updateBudget: (budget: Budget) => Promise<Budget>;
  removeBudget: (budgetId: string) => Promise<void>;

  // Period calculations
  getCurrentPeriod: (budget: Budget) => { start: Date; end: Date };
  getPastPeriods: (budget: Budget) => Promise<{ start: Date; end: Date; spent: number }[]>;
  calculateSpent: (budget: Budget, start: Date, end: Date) => Promise<number>;

  // Transaction integration
  updateBudgetForTransaction: (transaction: Transaction, action: TransactionAction, oldTransaction?: Transaction) => void;
  updateBudgetsForBulkTransactions: (transactions: Transaction[], action: TransactionAction, oldTransactions?: Transaction[]) => void;
  recalculateAllBudgets: () => void;
}

export const useBudgetStore = create<BudgetStore>((set, get) => ({
  budgets: [],
  isLoading: false,
  error: null,
  lastUpdated: null,

  fetchBudgets: async () => {
    set({ isLoading: true });
    try {
      const budgets = await fetchBudgetsFromDB();
      console.log('Fetched budgets from DB:', budgets.length);
      set({ budgets, isLoading: false, lastUpdated: Date.now() });
    } catch (error) {
      console.error('Fetch budgets error:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to fetch budgets', isLoading: false });
    }
  },

  saveBudget: async (budget: Budget) => {
    const newBudget = { ...budget, id: budget.id || new Date().toISOString() };
    await saveBudgetToDB(newBudget);

    // Optimistic update
    const currentBudgets = [...get().budgets];
    set({ budgets: [...currentBudgets, newBudget], lastUpdated: Date.now() });

    return newBudget;
  },

  updateBudget: async (budget: Budget) => {
    const updatedBudget = await updateBudgetInDB(budget);

    // Optimistic update
    const updatedBudgets = get().budgets.map(b =>
      b.id === budget.id ? updatedBudget : b
    );

    set({ budgets: updatedBudgets, lastUpdated: Date.now() });
    return updatedBudget;
  },

  removeBudget: async (budgetId: string) => {
    await deleteBudgetFromDB(budgetId);

    // Optimistic update
    const filteredBudgets = get().budgets.filter(b => b.id !== budgetId);
    set({ budgets: filteredBudgets, lastUpdated: Date.now() });
  },

  getCurrentPeriod: (budget: Budget) => {
    const periodStart = calculatePeriodStart(budget.startDate, budget.frequency, budget.periodLength);
    const periodEnd = calculatePeriodEnd(periodStart, budget.frequency, budget.periodLength);
    if (budget.endDate && periodEnd > new Date(budget.endDate)) {
      return { start: periodStart, end: new Date(budget.endDate) };
    }
    return { start: periodStart, end: periodEnd };
  },

  getPastPeriods: async (budget: Budget) => {
    const periods = [];
    let periodStart = new Date(budget.startDate);
    const now = new Date();
    const cappedEnd = budget.endDate ? new Date(budget.endDate) : now;

    while (periodStart < now && periodStart <= cappedEnd) {
      const periodEnd = calculatePeriodEnd(periodStart, budget.frequency, budget.periodLength);
      const actualEnd = periodEnd > cappedEnd ? cappedEnd : periodEnd;
      const spent = await calculateBudgetSpent(budget, periodStart, actualEnd);
      periods.push({ start: periodStart, end: actualEnd, spent });
      periodStart = new Date(actualEnd);
      periodStart.setDate(periodStart.getDate() + 1);
    }
    return periods;
  },

  calculateSpent: async (budget: Budget, start: Date, end: Date) => {
    return calculateBudgetSpent(budget, start, end);
  },

  // This method handles updating budgets when a single transaction changes
  updateBudgetForTransaction: (transaction: Transaction, action: TransactionAction, oldTransaction?: Transaction) => {
    console.log(`Updating budgets for ${action} transaction:`, transaction);

    // Skip processing if the transaction doesn't affect budgets (e.g., income or transfer)
    if (transaction.type !== 'expense') {
      console.log('Transaction is not an expense, skipping budget update');
      return;
    }

    // Trigger a UI update to reflect changes without a full DB refetch
    set({ lastUpdated: Date.now() });

    // For complex cases (like category changes), we might want to consider
    // which budgets are affected by the old and new transaction
    if (action === 'update' && oldTransaction && oldTransaction.category.id !== transaction.category.id) {
      console.log('Transaction category changed, multiple budgets may be affected');
    }
  },

  // This method handles updating budgets for multiple transactions at once
  updateBudgetsForBulkTransactions: (transactions: Transaction[], action: TransactionAction, oldTransactions?: Transaction[]) => {
    console.log(`Updating budgets for ${transactions.length} ${action} transactions`);

    // Filter to only include expense transactions that affect budgets
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    if (expenseTransactions.length === 0) {
      console.log('No expense transactions in bulk update, skipping budget update');
      return;
    }

    // Trigger a UI update to reflect changes without a full DB refetch
    set({ lastUpdated: Date.now() });
  },

  // This method recalculates all budget data (typically used after initial load)
  recalculateAllBudgets: () => {
    console.log('Recalculating all budgets');
    set({ lastUpdated: Date.now() });
  }
}));