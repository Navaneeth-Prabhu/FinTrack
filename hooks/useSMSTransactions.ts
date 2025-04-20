// useSMSTransactions.ts
import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { useTransactionStore } from '@/stores/transactionStore'; // Update import path as needed
import { useCategoryStore } from '@/stores/categoryStore'; // Update import path as needed
import { Transaction } from '@/types'; // Update import path as needed
import { scanSMSForTransactions } from '@/services/smsParser';

interface UseSMSTransactionsResult {
  scanning: boolean;
  autoScanSMS: (dayLimit?: number) => Promise<number>;
  lastScanDate: Date | null;
}

// This simplified hook automatically scans and saves transactions without user intervention
export const useSMSTransactions = (): UseSMSTransactionsResult => {
  const [scanning, setScanning] = useState<boolean>(false);
  const [lastScanDate, setLastScanDate] = useState<Date | null>(null);
  
  // Get store actions
  const saveTransaction = useTransactionStore(state => state.saveTransaction);
  const categories = useCategoryStore(state => state.categories);
  
  // Automatically scan SMS and save transactions
  const autoScanSMS = useCallback(async (dayLimit = 7): Promise<number> => {
    // Only run on Android
    if (Platform.OS !== 'android') {
      console.log('SMS scanning is only available on Android devices');
      return 0;
    }
    
    if (scanning) {
      console.log('Already scanning SMS');
      return 0;
    }
    
    setScanning(true);
    
    try {
      console.log(`Starting SMS scan for the last ${dayLimit} days...`);
      const transactions = await scanSMSForTransactions(categories, dayLimit);
      
      if (transactions.length === 0) {
        console.log('No new transactions found in SMS');
        return 0;
      }
      
      console.log(`Found ${transactions.length} transactions in SMS`);
      
      // Auto-save all discovered transactions
      let savedCount = 0;
      for (const transaction of transactions) {
        try {
          await saveTransaction(transaction);
          savedCount++;
        } catch (error) {
          console.error('Error saving transaction:', error);
        }
      }
      
      console.log(`Successfully saved ${savedCount} transactions from SMS`);
      setLastScanDate(new Date());
      return savedCount;
    } catch (error) {
      console.error('Error in auto SMS scan:', error);
      return 0;
    } finally {
      setScanning(false);
    }
  }, [categories, saveTransaction, scanning]);
  
  return {
    scanning,
    autoScanSMS,
    lastScanDate
  };
};