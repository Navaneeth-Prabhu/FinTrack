// src/store/transactionStore.ts
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
  findTransactionsByPayee,
} from '@/db/repository/transactionRepository';
import { useBudgetStore } from './budgetStore';
import { useAccountStore } from './accountStore';

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  currentPage: number;
  error: string | null;

  fetchTransactions: (limit?: number) => Promise<void>;
  fetchMoreTransactions: (limit?: number) => Promise<void>;
  saveTransaction: (transaction: Transaction) => Promise<Transaction>;
  updateTransaction: (transaction: Transaction) => Promise<Transaction | { updatedTransaction: Transaction, similarTransactions: Transaction[] }>;
  removeTransaction: (id: string) => Promise<void>;
  saveBulkTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  updateBulkTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  removeBulkTransactions: (ids: string[]) => Promise<void>;
  updateTransactionsWithCategory: (category: Category) => Promise<void>;
  findSimilarPayeeTransactions: (transaction: Transaction, newCategory: Category) => Promise<Transaction[]>;
  updateCategoryForSimilarPayeeTransactions: (transactions: Transaction[], newCategory: Category) => Promise<void>;
}

// Helper to adjust Account balances when a transaction is added or removed
const applyTransactionToAccounts = async (t: Transaction, isAdd: boolean) => {
  const { adjustBalance } = useAccountStore.getState();
  const multiplier = isAdd ? 1 : -1;

  try {
    if (t.type === 'income' && t.toAccount) {
      await adjustBalance(t.toAccount.id, t.amount * multiplier);
    } else if (t.type === 'expense' && t.fromAccount) {
      await adjustBalance(t.fromAccount.id, -t.amount * multiplier);
    } else if ((t.type === 'transfer' || t.type === 'investment')) {
      if (t.fromAccount) {
        await adjustBalance(t.fromAccount.id, -t.amount * multiplier);
      }
      if (t.toAccount) {
        await adjustBalance(t.toAccount.id, t.amount * multiplier);
      }
    }
  } catch (e) {
    console.error("Failed to update account balances:", e);
  }
};

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  isLoading: false,
  isFetchingMore: false,
  hasMore: true,
  currentPage: 0,
  error: null,

  fetchTransactions: async (limit?: number) => {
    try {
      set({ isLoading: true, error: null, currentPage: 0, hasMore: true });
      const transactions = await fetchTransactionsFromDB(limit, 0);
      set({
        transactions,
        isLoading: false,
        hasMore: limit !== undefined ? transactions.length === limit : false
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch transactions',
      });
      throw error;
    }
  },

  fetchMoreTransactions: async (limit: number = 50) => {
    const { isFetchingMore, hasMore, currentPage, transactions } = get();
    if (isFetchingMore || !hasMore) return;

    try {
      set({ isFetchingMore: true, error: null });
      const nextPage = currentPage + 1;
      const offset = nextPage * limit;

      const newTransactions = await fetchTransactionsFromDB(limit, offset);

      set({
        transactions: [...transactions, ...newTransactions],
        isFetchingMore: false,
        currentPage: nextPage,
        hasMore: newTransactions.length === limit
      });
    } catch (error) {
      set({
        isFetchingMore: false,
        error: error instanceof Error ? error.message : 'Failed to fetch more transactions',
      });
    }
  },

  saveTransaction: async (transaction: Transaction) => {
    try {
      // Optimistic Update: Immediately show in UI
      const newTransactions = [transaction, ...get().transactions];
      set({ transactions: newTransactions });

      // Persist to DB in background
      await saveTransactionToDB(transaction);

      useBudgetStore.getState().updateBudgetForTransaction(transaction, 'add');
      await applyTransactionToAccounts(transaction, true);

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

      const categoryChanged = oldTransaction.category?.id !== transaction.category?.id;

      // Reverse old effect, then apply new effect
      await applyTransactionToAccounts(oldTransaction, false);
      const updatedTransaction = await updateTransactionInDB(transaction);
      await applyTransactionToAccounts(updatedTransaction, true);

      const newTransactions = get().transactions.map(t =>
        t.id === updatedTransaction.id ? updatedTransaction : t
      );
      set({ transactions: newTransactions });
      useBudgetStore.getState().updateBudgetForTransaction(updatedTransaction, 'update', oldTransaction);

      console.log("[Smart Update] categoryChanged:", categoryChanged);
      if (categoryChanged) {
        const payee = transaction.type === 'expense' || transaction.type === 'transfer' || transaction.type === 'investment' ? transaction.paidTo : transaction.paidBy;
        console.log("[Smart Update] Payee extracted:", payee);
        if (payee && payee.trim() !== '' && payee !== 'Unknown Recipient' && payee !== 'Unknown Payer') {
          const similarTransactions = await get().findSimilarPayeeTransactions(
            transaction,
            oldTransaction.category
          );
          console.log("[Smart Update] Found similar transactions count:", similarTransactions.length);

          if (similarTransactions.length > 0) {
            return {
              updatedTransaction,
              similarTransactions
            } as any;
          }
        } else {
          console.log("[Smart Update] skipped: payee is empty or unknown.");
        }
      }

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
      await applyTransactionToAccounts(transactionToRemove, false);

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
      // Optimistic Update: Immediately show in UI
      const newTransactions = [...transactions, ...get().transactions];
      set({ transactions: newTransactions });

      const savedTransactions = await saveBulkTransactionsToDB(transactions);

      for (const t of savedTransactions) {
        await applyTransactionToAccounts(t, true);
      }

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

      for (const oldT of oldTransactions) {
        await applyTransactionToAccounts(oldT, false);
      }

      const updatedTransactions = await updateBulkTransactionsInDB(transactions);

      for (const newT of updatedTransactions) {
        await applyTransactionToAccounts(newT, true);
      }

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

      for (const t of transactionsToRemove) {
        await applyTransactionToAccounts(t, false);
      }

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
  findSimilarPayeeTransactions: async (transaction: Transaction, oldCategory: Category) => {
    try {
      const payee = transaction.type === 'expense' || transaction.type === 'transfer' || transaction.type === 'investment' ? transaction.paidTo : transaction.paidBy;
      console.log(`[Smart Update DB Query] finding by payee: ${payee}, type: ${transaction.type}, excludeId: ${transaction.id}`);
      if (!payee) return [];

      const similarTransactions = await findTransactionsByPayee(
        payee,
        transaction.type,
        transaction.id
      );
      console.log(`[Smart Update DB Query] Returned ${similarTransactions.length} items from DB`);

      // We only want to auto-update transactions that currently have the SAME category as the old one
      const filtered = similarTransactions.filter(t => t.category?.id === oldCategory?.id);
      console.log(`[Smart Update DB Query] After filtering by old category (${oldCategory?.name}), remaining: ${filtered.length}`);
      return filtered;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to find similar transactions',
      });
      return [];
    }
  },

  updateCategoryForSimilarPayeeTransactions: async (transactions: Transaction[], newCategory: Category) => {
    try {
      const transactionsToUpdate = transactions.map(transaction => ({
        ...transaction,
        category: newCategory,
        lastModified: Date.now().toString()
      }));

      await get().updateBulkTransactions(transactionsToUpdate);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update similar transactions',
      });
      throw error;
    }
  },

}));