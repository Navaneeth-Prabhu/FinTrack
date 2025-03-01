// src/services/backgroundTaskService.ts
import { useRecurringTransactionStore } from '@/stores/recurringTransactionStore';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

const RECURRING_TRANSACTIONS_TASK = 'RECURRING_TRANSACTIONS_TASK';

// Define the background task that will run periodically
TaskManager.defineTask(RECURRING_TRANSACTIONS_TASK, async () => {
  try {
    console.log('[Background] Running recurring transactions task');
    
    // Load recurring transactions (needed in case app was terminated)
    await useRecurringTransactionStore.getState().fetchRecurringTransactions();
    
    // Generate any due transactions
    await useRecurringTransactionStore.getState().generateRecurringTransactions();
    
    console.log('[Background] Recurring transactions task completed successfully');
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('[Background] Error in recurring transactions task:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register the background task
export const registerRecurringTask = async () => {
  try {
    // Check if the task is already registered
    const status = await BackgroundFetch.getStatusAsync();
    
    // Only register if not already registered
    if (status === BackgroundFetch.BackgroundFetchStatus.Available) {
      console.log('Registering background task for recurring transactions');
      
      await BackgroundFetch.registerTaskAsync(RECURRING_TRANSACTIONS_TASK, {
        minimumInterval: 15 * 60, // Run at least every 15 minutes
        stopOnTerminate: false,   // Continue running if app is closed
        startOnBoot: true,        // Run after device restart
      });
      
      console.log('Background task registered successfully');
    } else {
      console.log('Background fetch is not available on this device', status);
    }
  } catch (error) {
    console.error('Failed to register background task:', error);
  }
};

// Unregister the task (use when needed)
export const unregisterRecurringTask = async () => {
  try {
    await BackgroundFetch.unregisterTaskAsync(RECURRING_TRANSACTIONS_TASK);
    console.log('Background task unregistered');
  } catch (error) {
    console.error('Failed to unregister background task:', error);
  }
};