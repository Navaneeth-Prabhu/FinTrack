// hooks/useSMSTransactions.ts
import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { useTransactionStore } from '@/stores/transactionStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { importSMSTransactionsToStore } from '@/utils/SMSTransactionUtil';
import { supabase } from '@/services/supabaseClient';

interface UseSMSTransactionsResult {
  scanning: boolean;
  autoScanSMS: () => Promise<number>;
  lastScanDate: Date | null;
}

export const useSMSTransactions = (): UseSMSTransactionsResult => {
  const [scanning, setScanning] = useState<boolean>(false);
  const [lastScanDate, setLastScanDate] = useState<Date | null>(null);

  const saveTransaction = useTransactionStore(state => state.saveTransaction);
  const categories = useCategoryStore(state => state.categories);

  const autoScanSMS = useCallback(async (): Promise<number> => {
    if (Platform.OS !== 'android') return 0;
    if (scanning) return 0;

    setScanning(true);
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data?.session?.user?.id ?? null;

      const count = await importSMSTransactionsToStore(categories, saveTransaction, userId, true);
      if (count > 0) setLastScanDate(new Date());
      return count;
    } catch (err) {
      console.error('[useSMSTransactions] Error:', err);
      return 0;
    } finally {
      setScanning(false);
    }
  }, [categories, saveTransaction, scanning]);

  return { scanning, autoScanSMS, lastScanDate };
};