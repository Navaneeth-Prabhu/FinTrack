// src/store/recurringTransactionStore.ts
import { create } from 'zustand';
import { RecurringTransaction, Transaction } from '@/types';
import {
  fetchRecurringTransactionsFromDB,
  saveRecurringTransactionToDB,
  updateRecurringTransactionInDB,
  deleteRecurringTransactionFromDB,
} from '@/db/repository/recurringTransactionRepository';
import { useTransactionStore } from './transactionStore';
import { add, isBefore, format } from 'date-fns';

interface RecurringTransactionState {
  recurringTransactions: RecurringTransaction[];
  isLoading: boolean;
  error: string | null;

  fetchRecurringTransactions: () => Promise<void>;
  saveRecurringTransaction: (recurring: RecurringTransaction) => Promise<RecurringTransaction>;
  updateRecurringTransaction: (recurring: RecurringTransaction) => Promise<RecurringTransaction>;
  removeRecurringTransaction: (id: string) => Promise<void>;
  generateRecurringTransactions: () => Promise<void>;
}

export const useRecurringTransactionStore = create<RecurringTransactionState>((set, get) => ({
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
        error: error instanceof Error ? error.message : 'Failed to fetch recurring transactions',
      });
      throw error;
    }
  },

  saveRecurringTransaction: async (recurring: RecurringTransaction) => {
    try {
      const recurringWithMeta: RecurringTransaction = {
        ...recurring,
        interval: recurring.interval || 1,
        isActive: recurring.isActive !== undefined ? (typeof recurring.isActive === 'boolean' ? (recurring.isActive ? 1 : 0) : recurring.isActive) : 1,
        createdAt: recurring.createdAt || new Date().toISOString(),
        lastModified: new Date().toISOString(),
        lastGeneratedDate: recurring.lastGeneratedDate || undefined,
      };
      await saveRecurringTransactionToDB(recurringWithMeta);
      set(state => ({
        recurringTransactions: [...state.recurringTransactions, recurringWithMeta],
      }));
      await get().generateRecurringTransactions(); // This generates an initial transaction
      return recurringWithMeta;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to save recurring transaction' });
      throw error;
    }
  },

  updateRecurringTransaction: async (recurring: RecurringTransaction) => {
    try {
      const updatedRecurring = await updateRecurringTransactionInDB(recurring);
      set(state => ({
        recurringTransactions: state.recurringTransactions.map(r =>
          r.id === updatedRecurring.id ? updatedRecurring : r
        ),
      }));
      // Regenerate transactions to reflect changes
      await get().generateRecurringTransactions();
      return updatedRecurring;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update recurring transaction',
      });
      throw error;
    }
  },

  removeRecurringTransaction: async (id: string) => {
    try {
      await deleteRecurringTransactionFromDB(id);
      set(state => ({
        recurringTransactions: state.recurringTransactions.filter(r => r.id !== id),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to remove recurring transaction',
      });
      throw error;
    }
  },

  generateRecurringTransactions: async () => {
    const { recurringTransactions } = get();
    const now = new Date();
    const newTransactions: Transaction[] = [];
    const transactionStore = useTransactionStore.getState();

    console.log(recurringTransactions, 'recurringTransactions');
    for (const recurring of recurringTransactions) {
      if (!recurring.isActive) continue;

      let currentDate = recurring.lastGeneratedDate
        ? add(new Date(recurring.lastGeneratedDate), {
          days: recurring.frequency === 'daily' ? recurring.interval : 0,
          weeks: recurring.frequency === 'weekly' ? recurring.interval : 0,
          months: recurring.frequency === 'monthly' ? recurring.interval : 0,
          years: recurring.frequency === 'yearly' ? recurring.interval : 0,
        })
        : new Date(recurring.startDate);
      const endDate = recurring.endDate ? new Date(recurring.endDate) : null;
      const time = recurring.time || format(now, 'HH:mm');

      while ((!endDate || isBefore(currentDate, endDate)) && isBefore(currentDate, now)) {
        const dateWithTime = new Date(currentDate);
        const [hours, minutes] = time.split(':');
        dateWithTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        if (isBefore(dateWithTime, now)) {
          const categories = transactionStore.transactions.map(t => t.category).filter(c => c.id === recurring.category.id);
          const category = categories[0] || recurring.category;

          const transaction: Transaction = {
            id: `${recurring.id}-${dateWithTime.toISOString()}`,
            amount: recurring.amount,
            type: recurring.type,
            category,
            date: dateWithTime.toISOString(),
            paidTo: recurring.type === 'expense' ? recurring.payee : undefined,
            paidBy: recurring.type === 'income' ? recurring.payee : undefined,
            mode: recurring.mode || 'auto',
            createdAt: now.toISOString(),
            lastModified: now.toISOString(),
            source: { type: 'auto' },
            note: recurring.description,
            recurringId: recurring.id, // Ensure set here
          };

          if (!transactionStore.transactions.some(t => t.id === transaction.id)) {
            newTransactions.push(transaction);
          }
        }

        currentDate = add(currentDate, {
          days: recurring.frequency === 'daily' ? recurring.interval : 0,
          weeks: recurring.frequency === 'weekly' ? recurring.interval : 0,
          months: recurring.frequency === 'monthly' ? recurring.interval : 0,
          years: recurring.frequency === 'yearly' ? recurring.interval : 0,
        });
      }

      if (newTransactions.length > 0) {
        const lastDate = newTransactions[newTransactions.length - 1].date;
        recurring.lastGeneratedDate = lastDate;
        await updateRecurringTransactionInDB({ ...recurring, lastModified: new Date().toISOString() });
        set(state => ({
          recurringTransactions: state.recurringTransactions.map(r =>
            r.id === recurring.id ? { ...r, lastGeneratedDate: lastDate } : r
          ),
        }));
      }
    }

    if (newTransactions.length > 0) {
      console.log('Generated Transactions:', newTransactions);
      await transactionStore.saveBulkTransactions(newTransactions);
    }
  },
}));