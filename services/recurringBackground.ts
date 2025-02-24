import { useRecurringTransactionStore } from '@/stores/recurringTransactionStore';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

const RECURRING_TASK = 'generate-recurring-transactions';

TaskManager.defineTask(RECURRING_TASK, async () => {
  try {
    await useRecurringTransactionStore.getState().generateRecurringTransactions();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background task failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const registerRecurringTask = async () => {
  await BackgroundFetch.registerTaskAsync(RECURRING_TASK, {
    minimumInterval: 60 * 60, // Run every hour
    stopOnTerminate: false,
    startOnBoot: true,
  });
};

export const unregisterRecurringTask = async () => {
  await BackgroundFetch.unregisterTaskAsync(RECURRING_TASK);
};