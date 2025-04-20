// src/services/smsInitService.ts
import { Platform } from 'react-native';
import { Category, Transaction } from '@/types';
import smsService from './smsService';

/**
 * Initialize SMS features during app startup
 * @param categories Current categories from the store
 * @param saveTransactionFn Function to save a transaction
 */
export const initializeSMSFeatures = async (
  categories: Category[],
  saveTransactionFn: (transaction: Transaction) => Promise<Transaction>
): Promise<void> => {
  // Only run on Android
  if (Platform.OS !== 'android') {
    console.log('SMS features are only available on Android');
    return;
  }

  try {
    console.log('Starting SMS initialization...');
    
    // Check permission - this is non-blocking
    const hasPermission = await smsService.checkPermission();
    if (!hasPermission) {
      console.log('SMS permission not granted - feature will be disabled');
      return;
    }
    
    // If we have permission, scan for messages
    console.log('Checking for transactions in SMS history...');
    
    // Import transactions without UI feedback (quiet background import)
    const count = await smsService.importTransactionsToStore(categories, saveTransactionFn);
    
    if (count > 0) {
      console.log(`Imported ${count} transactions from SMS`);
    } else {
      console.log('No new transactions found in SMS');
    }
    
    console.log('SMS initialization complete');
  } catch (error) {
    console.error('Error in SMS initialization:', error);
  }
};

/**
 * Set up a function to scan for new SMS periodically
 * @param categories Current categories from the store
 * @param saveTransactionFn Function to save a transaction
 * @param intervalMinutes How often to scan (default: 60 minutes)
 */
export const setupPeriodicSMSScan = (
  categories: Category[],
  saveTransactionFn: (transaction: Transaction) => Promise<Transaction>,
  intervalMinutes = 60
): (() => void) => {
  if (Platform.OS !== 'android') return () => {};
  
  const intervalId = setInterval(async () => {
    try {
      await smsService.performPeriodicScan(categories, saveTransactionFn);
    } catch (error) {
      console.error('Error in periodic SMS scan:', error);
    }
  }, intervalMinutes * 60 * 1000);
  
  // Return cleanup function
  return () => clearInterval(intervalId);
};