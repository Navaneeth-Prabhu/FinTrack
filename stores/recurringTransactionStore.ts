// src/store/recurringTransactionStore.ts
import { create } from 'zustand';
import { RecurringTransaction } from '@/src/types';
import {
  fetchRecurringTransactionsFromDB,
  saveRecurringTransactionToDB,
  deleteRecurringTransactionFromDB,
  updateRecurringTransactionInDB,
} from '@/src/database/recurringTransactionRepository';

interface RecurringTransactionState {
  recurringTransactions: RecurringTransaction[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchRecurringTransactions: () => Promise<void>;
  saveRecurringTransaction: (transaction: RecurringTransaction) => Promise<RecurringTransaction>;
  updateRecurringTransaction: (transaction: RecurringTransaction) => Promise<RecurringTransaction>;
  removeRecurringTransaction: (id: string) => Promise<void>;
}

export const useRecurringTransactionStore = create<RecurringTransactionState>((set) => ({
  recurringTransactions: [],
  isLoading: false,
  error: null,
  
  fetchRecurringTransactions: async () => {
    try {
      set({ isLoading: true, error: null });
      const recurringTransactions = await fetchRecurringTransactionsFromDB();
      set({ recurringTransactions, isLoading: false });
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch recurring transactions'
      });
    }
  },
  
  saveRecurringTransaction: async (transaction: RecurringTransaction) => {
    try {
      await saveRecurringTransactionToDB(transaction);
      set(state => ({ 
        recurringTransactions: [...state.recurringTransactions, transaction] 
      }));
      return transaction;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to save recurring transaction'
      });
      throw error;
    }
  },
  
  updateRecurringTransaction: async (transaction: RecurringTransaction) => {
    try {
      const updatedTransaction = await updateRecurringTransactionInDB(transaction);
      set(state => ({
        recurringTransactions: state.recurringTransactions.map(rt => 
          rt.id === updatedTransaction.id ? updatedTransaction : rt
        )
      }));
      return updatedTransaction;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update recurring transaction'
      });
      throw error;
    }
  },
  
  removeRecurringTransaction: async (id: string) => {
    try {
      await deleteRecurringTransactionFromDB(id);
      set(state => ({
        recurringTransactions: state.recurringTransactions.filter(rt => rt.id !== id)
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to remove recurring transaction'
      });
      throw error;
    }
  },
}));