import { create } from 'zustand';
import { RecurringTransaction, Transaction } from '@/types';
import {
  fetchRecurringTransactionsFromDB,
  saveRecurringTransactionToDB,
  updateRecurringTransactionInDB,
  deleteRecurringTransactionFromDB,
} from '@/db/repository/recurringTransactionRepository';
import { useTransactionStore } from './transactionStore';
import { add, isBefore, format, isAfter, parseISO, startOfDay } from 'date-fns';

interface RecurringTransactionState {
  recurringTransactions: RecurringTransaction[];
  isLoading: boolean;
  error: string | null;

  fetchRecurringTransactions: () => Promise<void>;
  saveRecurringTransaction: (recurring: RecurringTransaction) => Promise<RecurringTransaction>;
  updateRecurringTransaction: (recurring: RecurringTransaction) => Promise<RecurringTransaction>;
  removeRecurringTransaction: (id: string) => Promise<void>;
  generateRecurringTransactions: () => Promise<void>;
  generateDueTransactionsNow: () => Promise<boolean>;
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
      // Get current state of the transaction before updating
      const currentState = get();
      const existingRecurring = currentState.recurringTransactions.find(r => r.id === recurring.id);

      // Set current time as the update timestamp
      const now = new Date();
      const updatedRecurring = {
        ...recurring,
        lastModified: now.toISOString(),
      };

      // If this is an update, set the lastGeneratedDate to now
      // This will ensure future generations start from now
      if (existingRecurring) {
        updatedRecurring.lastGeneratedDate = now.toISOString();
      }

      // Update in DB and state
      await updateRecurringTransactionInDB(updatedRecurring);

      set(state => ({
        recurringTransactions: state.recurringTransactions.map(r =>
          r.id === updatedRecurring.id ? updatedRecurring : r
        ),
      }));

      // No need to generate transactions here, as the lastGeneratedDate
      // is now set to current time, so future runs will start from now
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
    const existingTransactions = transactionStore.transactions;

    console.log('Running generation with', recurringTransactions.length, 'recurring transactions');

    for (const recurring of recurringTransactions) {
      // Skip inactive recurring transactions
      if (!recurring.isActive) {
        console.log(`Skipping inactive recurring transaction: ${recurring.id}`);
        continue;
      }

      // Determine the starting point for generation
      const startPoint = recurring.lastGeneratedDate
        ? new Date(recurring.lastGeneratedDate) // Start from last generated date
        : new Date(recurring.startDate);        // Or from the initial start date

      console.log(`Processing recurring transaction ${recurring.id}`, {
        startDate: recurring.startDate,
        lastGenerated: recurring.lastGeneratedDate,
        startPoint: startPoint.toISOString(),
        now: now.toISOString()
      });

      // Calculate the next date after the starting point
      let currentDate = add(startPoint, {
        days: recurring.frequency === 'daily' ? recurring.interval : 0,
        weeks: recurring.frequency === 'weekly' ? recurring.interval : 0,
        months: recurring.frequency === 'monthly' ? recurring.interval : 0,
        years: recurring.frequency === 'yearly' ? recurring.interval : 0,
      });

      const endDate = recurring.endDate ? new Date(recurring.endDate) : null;
      // Ensure we have a time component, defaulting to current time if not specified
      const time = recurring.time || format(now, 'HH:mm');

      // Track the most recent transaction date for updating lastGeneratedDate
      let lastTransactionDate: string | null = null;

      // Generate all transactions between the start point and now
      while ((!endDate || isBefore(currentDate, endDate)) && isBefore(currentDate, now)) {
        // Apply the time component to the current date
        const dateWithTime = new Date(currentDate);
        const [hours, minutes] = time.split(':').map(part => parseInt(part, 10));
        dateWithTime.setHours(hours, minutes, 0, 0);

        // Skip dates in the future
        if (isBefore(dateWithTime, now)) {
          // Create a transaction ID that's deterministic and unique
          const transactionId = `${recurring.id}-${format(dateWithTime, 'yyyy-MM-dd-HH-mm')}`;

          // Check if this transaction already exists using the deterministic ID
          const transactionExists = existingTransactions.some(t => t.id === transactionId);

          if (!transactionExists) {
            // Get the category from existing transactions if possible
            // This provides the most up-to-date category information
            const matchingCategory = existingTransactions
              .map(t => t.category)
              .find(c => c.id === recurring.category.id);

            const category = matchingCategory || recurring.category;

            // Create the transaction
            const transaction: Transaction = {
              id: transactionId,
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
              recurringId: recurring.id,
            };

            newTransactions.push(transaction);
            console.log(`Generated new transaction: ${transaction.id} for date ${dateWithTime.toISOString()}`);

            // Update the most recent transaction date
            lastTransactionDate = dateWithTime.toISOString();
          } else {
            console.log(`Transaction already exists for: ${transactionId}`);
          }
        }

        // Move to the next occurrence
        currentDate = add(currentDate, {
          days: recurring.frequency === 'daily' ? recurring.interval : 0,
          weeks: recurring.frequency === 'weekly' ? recurring.interval : 0,
          months: recurring.frequency === 'monthly' ? recurring.interval : 0,
          years: recurring.frequency === 'yearly' ? recurring.interval : 0,
        });
      }

      // Only update lastGeneratedDate if we created at least one transaction
      if (lastTransactionDate) {
        console.log(`Updating lastGeneratedDate for ${recurring.id} to ${lastTransactionDate}`);
        // Update the recurring transaction with the new lastGeneratedDate
        await updateRecurringTransactionInDB({
          ...recurring,
          lastGeneratedDate: lastTransactionDate,
          lastModified: now.toISOString()
        });

        // Update the in-memory state
        set(state => ({
          recurringTransactions: state.recurringTransactions.map(r =>
            r.id === recurring.id ? { ...r, lastGeneratedDate: lastTransactionDate } : r
          ),
        }));
      }
    }

    // Save all new transactions in a single batch
    if (newTransactions.length > 0) {
      console.log(`Saving ${newTransactions.length} new transactions`);
      await transactionStore.saveBulkTransactions(newTransactions);
    } else {
      console.log('No new transactions to generate');
    }
  },

  generateDueTransactionsNow: async () => {
    try {
      set({ isLoading: true, error: null });
      await get().fetchRecurringTransactions(); // Refresh data first
      await get().generateRecurringTransactions();
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to generate transactions'
      });
      return false;
    }
  },
}));