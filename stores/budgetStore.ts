import { create } from 'zustand';
import { Budget, Transaction } from '@/types';
import {
  fetchBudgetsFromDB,
  saveBudgetToDB,
  deleteBudgetFromDB,
  updateBudgetInDB,
} from '@/db/repository/budgetRepository';
import { useTransactionStore } from './transactionStore';
import { isTransactionInBudgetPeriod, recalculateBudgetSpent } from '@/utils/budget';

interface BudgetState {
  budgets: Budget[];
  isLoading: boolean;
  error: string | null;
  

  fetchBudgets: () => Promise<void>;
  saveBudget: (budget: Budget) => Promise<Budget>;
  updateBudget: (budget: Budget) => Promise<Budget>;
  removeBudget: (id: string) => Promise<void>;
  setBudgets: (budgets: Budget[]) => void;
  recalculateAllBudgets: () => void;
  updateBudgetForTransaction: (
    transaction: Transaction,
    operation: 'add' | 'update' | 'remove',
    oldTransaction?: Transaction
  ) => void;
  updateBudgetsForBulkTransactions: (
    transactions: Transaction[],
    operation: 'add' | 'update' | 'remove',
    oldTransactions?: Transaction[]
  ) => void;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budgets: [],
  isLoading: false,
  error: null,

  fetchBudgets: async () => {
    try {
      set({ isLoading: true, error: null });
      const budgets = await fetchBudgetsFromDB();
      const transactions = useTransactionStore.getState().transactions;

      const updatedBudgets = budgets.map(budget => {
        const spent = recalculateBudgetSpent(budget, transactions);
        const progress = Number(((spent / budget.limit) * 100).toFixed(2));
        return { ...budget, spent, progress };
      });

      set({ budgets: updatedBudgets, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch budgets',
      });
    }
  },

  saveBudget: async (budget: Budget) => {
    try {
      const transactions = useTransactionStore.getState().transactions;
      const spent = recalculateBudgetSpent(budget, transactions);
      const progress = Number(((spent / budget.limit) * 100).toFixed(2));
      const budgetToSave = { ...budget, spent, progress };

      await saveBudgetToDB(budgetToSave);
      set(state => ({
        budgets: [...state.budgets, budgetToSave],
      }));
      return budgetToSave;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to save budget',
      });
      throw error;
    }
  },

  updateBudget: async (budget: Budget) => {
    try {
      const transactions = useTransactionStore.getState().transactions;
      const spent = recalculateBudgetSpent(budget, transactions);
      const progress = Number(((spent / budget.limit) * 100).toFixed(2));
      const budgetToUpdate = { ...budget, spent, progress };

      const updatedBudget = await updateBudgetInDB(budgetToUpdate);
      set(state => ({
        budgets: state.budgets.map(b => (b.id === updatedBudget.id ? updatedBudget : b)),
      }));
      return updatedBudget;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update budget',
      });
      throw error;
    }
  },

  removeBudget: async (id: string) => {
    try {
      await deleteBudgetFromDB(id);
      set(state => ({
        budgets: state.budgets.filter(b => b.id !== id),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to remove budget',
      });
      throw error;
    }
  },

  setBudgets: (budgets: Budget[]) => {
    set({ budgets });
  },

  recalculateAllBudgets: () => {
    const { budgets } = get();
    const transactions = useTransactionStore.getState().transactions;

    const updatedBudgets = budgets.map(budget => {
      const spent = recalculateBudgetSpent(budget, transactions);
      const progress = Number(((spent / budget.limit) * 100).toFixed(2));
      return { ...budget, spent, progress };
    });

    set({ budgets: updatedBudgets });
  },

  updateBudgetForTransaction: (
    transaction: Transaction,
    operation: 'add' | 'update' | 'remove',
    oldTransaction?: Transaction
  ) => {
    if (transaction.type !== 'expense') return;

    const { budgets } = get();
    const affectedBudgets = budgets.filter(budget =>
      isTransactionInBudgetPeriod(transaction, budget) ||
      (oldTransaction && isTransactionInBudgetPeriod(oldTransaction, budget))
    );

    if (affectedBudgets.length === 0) return;

    const updatedBudgets = budgets.map(budget => {
      if (!affectedBudgets.some(b => b.id === budget.id)) return budget;

      let newSpent = budget.spent;
      if (operation === 'add') {
        if (isTransactionInBudgetPeriod(transaction, budget)) {
          newSpent += transaction.amount;
        }
      } else if (operation === 'update' && oldTransaction) {
        if (isTransactionInBudgetPeriod(oldTransaction, budget)) {
          newSpent -= oldTransaction.amount;
        }
        if (isTransactionInBudgetPeriod(transaction, budget)) {
          newSpent += transaction.amount;
        }
      } else if (operation === 'remove') {
        if (isTransactionInBudgetPeriod(transaction, budget)) {
          newSpent = Math.max(0, newSpent - transaction.amount);
        }
      }

      const progress = Number(((newSpent / budget.limit) * 100).toFixed(2));
      return { ...budget, spent: newSpent, progress };
    });

    set({ budgets: updatedBudgets });
  },

  updateBudgetsForBulkTransactions: (
    transactions: Transaction[],
    operation: 'add' | 'update' | 'remove',
    oldTransactions?: Transaction[]
  ) => {
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    if (expenseTransactions.length === 0) return;

    const { budgets } = get();
    const affectedBudgetIds = new Set<string>();

    // Identify affected budgets
    expenseTransactions.forEach(t => {
      budgets.forEach(b => {
        if (isTransactionInBudgetPeriod(t, b)) affectedBudgetIds.add(b.id);
      });
    });
    if (operation === 'update' && oldTransactions) {
      oldTransactions.forEach(t => {
        budgets.forEach(b => {
          if (isTransactionInBudgetPeriod(t, b)) affectedBudgetIds.add(b.id);
        });
      });
    } else if (operation === 'remove') {
      expenseTransactions.forEach(t => {
        budgets.forEach(b => {
          if (isTransactionInBudgetPeriod(t, b)) affectedBudgetIds.add(b.id);
        });
      });
    }

    if (affectedBudgetIds.size === 0) return;

    const updatedBudgets = budgets.map(budget => {
      if (!affectedBudgetIds.has(budget.id)) return budget;

      let newSpent = budget.spent;
      if (operation === 'add') {
        newSpent += expenseTransactions
          .filter(t => isTransactionInBudgetPeriod(t, budget))
          .reduce((sum, t) => sum + t.amount, 0);
      } else if (operation === 'update' && oldTransactions) {
        newSpent -= oldTransactions
          .filter(t => isTransactionInBudgetPeriod(t, budget))
          .reduce((sum, t) => sum + t.amount, 0);
        newSpent += expenseTransactions
          .filter(t => isTransactionInBudgetPeriod(t, budget))
          .reduce((sum, t) => sum + t.amount, 0);
      } else if (operation === 'remove') {
        newSpent -= expenseTransactions
          .filter(t => isTransactionInBudgetPeriod(t, budget))
          .reduce((sum, t) => sum + t.amount, 0);
        newSpent = Math.max(0, newSpent);
      }

      const progress = Number(((newSpent / budget.limit) * 100).toFixed(2));
      return { ...budget, spent: newSpent, progress };
    });

    set({ budgets: updatedBudgets });
  },
}));