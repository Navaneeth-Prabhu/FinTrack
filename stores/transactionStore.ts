// src/store/transactionStore.ts (simplified)
import { create } from 'zustand';
import { Transaction, Category } from '@/types';
import {
  fetchTransactionsFromDB,
  saveTransactionToDB,
  deleteTransactionFromDB,
  updateTransactionInDB,
  deleteBulkTransactionsFromDB,
  updateBulkTransactionsInDB,
  saveBulkTransactionsToDB,
} from '@/db/repository/transactionRepository';
import { useBudgetStore } from './budgetStore';

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;

  fetchTransactions: () => Promise<void>;
  saveTransaction: (transaction: Transaction) => Promise<Transaction>;
  updateTransaction: (transaction: Transaction) => Promise<Transaction>;
  removeTransaction: (id: string) => Promise<void>;
  saveBulkTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  updateBulkTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  removeBulkTransactions: (ids: string[]) => Promise<void>;
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
      // useBudgetStore.getState().recalculateAllBudgets(); // Full recalc on load
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch transactions',
      });
      throw error;
    }
  },

  saveTransaction: async (transaction: Transaction) => {
    try {
      await saveTransactionToDB(transaction);
      const newTransactions = [transaction, ...get().transactions];
      set({ transactions: newTransactions });
      useBudgetStore.getState().updateBudgetForTransaction(transaction, 'add');
      return transaction;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to save transaction',
      });
      throw error;
    }
  },

  updateTransaction: async (transaction: Transaction) => {
    try {
      const oldTransaction = get().transactions.find(t => t.id === transaction.id);
      if (!oldTransaction) throw new Error('Transaction not found');

      const updatedTransaction = await updateTransactionInDB(transaction);
      const newTransactions = get().transactions.map(t =>
        t.id === updatedTransaction.id ? updatedTransaction : t
      );
      set({ transactions: newTransactions });
      useBudgetStore.getState().updateBudgetForTransaction(updatedTransaction, 'update', oldTransaction);
      return updatedTransaction;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update transaction',
      });
      throw error;
    }
  },

  removeTransaction: async (id: string) => {
    try {
      const transactionToRemove = get().transactions.find(t => t.id === id);
      if (!transactionToRemove) throw new Error('Transaction not found');

      await deleteTransactionFromDB(id);
      const newTransactions = get().transactions.filter(t => t.id !== id);
      set({ transactions: newTransactions });
      useBudgetStore.getState().updateBudgetForTransaction(transactionToRemove, 'remove');
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to remove transaction',
      });
      throw error;
    }
  },

  saveBulkTransactions: async (transactions: Transaction[]) => {
    try {
      const savedTransactions = await saveBulkTransactionsToDB(transactions);
      const newTransactions = [...savedTransactions, ...get().transactions];
      set({ transactions: newTransactions });
      useBudgetStore.getState().updateBudgetsForBulkTransactions(savedTransactions, 'add');
      return savedTransactions;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to save bulk transactions',
      });
      throw error;
    }
  },

  updateBulkTransactions: async (transactions: Transaction[]) => {
    try {
      const oldTransactions = transactions.map(t => {
        const old = get().transactions.find(oldT => oldT.id === t.id);
        if (!old) throw new Error(`Transaction with id ${t.id} not found`);
        return old;
      });

      const updatedTransactions = await updateBulkTransactionsInDB(transactions);
      const newTransactions = get().transactions.map(t =>
        updatedTransactions.find(ut => ut.id === t.id) || t
      );
      set({ transactions: newTransactions });
      useBudgetStore.getState().updateBudgetsForBulkTransactions(updatedTransactions, 'update', oldTransactions);
      return updatedTransactions;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update bulk transactions',
      });
      throw error;
    }
  },

  removeBulkTransactions: async (ids: string[]) => {
    try {
      const transactionsToRemove = ids.map(id => {
        const transaction = get().transactions.find(t => t.id === id);
        if (!transaction) throw new Error(`Transaction with id ${id} not found`);
        return transaction;
      });

      await deleteBulkTransactionsFromDB(ids);
      const newTransactions = get().transactions.filter(t => !ids.includes(t.id));
      set({ transactions: newTransactions });
      useBudgetStore.getState().updateBudgetsForBulkTransactions(transactionsToRemove, 'remove');
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to remove bulk transactions',
      });
      throw error;
    }
  },

  updateTransactionsWithCategory: async (category: Category) => {
    try {
      const { transactions } = get();
      const transactionsToUpdate = transactions.filter(t => t.category.id === category.id);

      const updatedTransactions = await Promise.all(
        transactionsToUpdate.map(async transaction => {
          const updatedTransaction = { ...transaction, category: { ...category } };
          return await updateTransactionInDB(updatedTransaction);
        })
      );

      const newTransactions = transactions.map(t =>
        updatedTransactions.find(ut => ut.id === t.id) || t
      );
      set({ transactions: newTransactions });
      useBudgetStore.getState().updateBudgetsForBulkTransactions(updatedTransactions, 'update', transactionsToUpdate);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update transactions with category',
      });
      throw error;
    }
  },
}));