// src/store/transactionStore.ts
import { create } from 'zustand';
import { Transaction, Category } from '@/types';
import {
  fetchTransactionsFromDB,
  saveTransactionToDB,
  deleteTransactionFromDB,
  updateTransactionInDB,
} from '@/db/repository/transactionRepository';

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchTransactions: () => Promise<void>;
  saveTransaction: (transaction: Transaction) => Promise<Transaction>;
  updateTransaction: (transaction: Transaction) => Promise<Transaction>;
  removeTransaction: (id: string) => Promise<void>;
  updateTransactionsWithCategory: (category: Category) => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  isLoading: false,
  error: null,
  
  fetchTransactions: async () => {
    try {
      set({ isLoading: true, error: null });
      const transactions = await fetchTransactionsFromDB();
      set({ transactions, isLoading: false });
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch transactions'
      });
    }
  },
  
  saveTransaction: async (transaction: Transaction) => {
    try {
      await saveTransactionToDB(transaction);
      set(state => ({ 
        transactions: [transaction, ...state.transactions] 
      }));
      return transaction;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to save transaction'
      });
      throw error;
    }
  },
  
  updateTransaction: async (transaction: Transaction) => {
    try {
      const updatedTransaction = await updateTransactionInDB(transaction);
      set(state => ({
        transactions: state.transactions.map(t => 
          t.id === updatedTransaction.id ? updatedTransaction : t
        )
      }));
      return updatedTransaction;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update transaction'
      });
      throw error;
    }
  },
  
  removeTransaction: async (id: string) => {
    try {
      await deleteTransactionFromDB(id);
      set(state => ({
        transactions: state.transactions.filter(t => t.id !== id)
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to remove transaction'
      });
      throw error;
    }
  },
  
  updateTransactionsWithCategory: async (category: Category) => {
    try {
      const { transactions, updateTransaction } = get();
      
      // Filter transactions matching the category
      const transactionsToUpdate = transactions.filter(
        transaction => transaction.category.id === category.id
      );
      
      // Update each transaction
      for (const transaction of transactionsToUpdate) {
        const updatedTransaction = {
          ...transaction,
          category: {
            id: category.id,
            name: category.name,
            icon: category.icon,
            type: category.type,
            color: category.color
          }
        };
        
        await updateTransaction(updatedTransaction);
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update transactions with category'
      });
      throw error;
    }
  }
}));