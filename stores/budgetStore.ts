// src/store/budgetStore.ts
import { create } from 'zustand';
import { Budget } from '@/types';
import {
  fetchBudgetsFromDB,
  saveBudgetToDB,
  deleteBudgetFromDB,
  updateBudgetInDB,
} from '@/db/repository/budgetRepository';

interface BudgetState {
  budgets: Budget[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchBudgets: () => Promise<void>;
  saveBudget: (budget: Budget) => Promise<Budget>;
  updateBudget: (budget: Budget) => Promise<Budget>;
  removeBudget: (id: string) => Promise<void>;
}

export const useBudgetStore = create<BudgetState>((set) => ({
  budgets: [],
  isLoading: false,
  error: null,
  
  fetchBudgets: async () => {
    try {
      set({ isLoading: true, error: null });
      const budgets = await fetchBudgetsFromDB();
      set({ budgets, isLoading: false });
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch budgets'
      });
    }
  },
  
  saveBudget: async (budget: Budget) => {
    try {
      await saveBudgetToDB(budget);
      set(state => ({ 
        budgets: [...state.budgets, budget] 
      }));
      return budget;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to save budget'
      });
      throw error;
    }
  },
  
  updateBudget: async (budget: Budget) => {
    try {
      const updatedBudget = await updateBudgetInDB(budget);
      set(state => ({
        budgets: state.budgets.map(b => 
          b.id === updatedBudget.id ? updatedBudget : b
        )
      }));
      return updatedBudget;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update budget'
      });
      throw error;
    }
  },
  
  removeBudget: async (id: string) => {
    try {
      await deleteBudgetFromDB(id);
      set(state => ({
        budgets: state.budgets.filter(b => b.id !== id)
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to remove budget'
      });
      throw error;
    }
  },
}));