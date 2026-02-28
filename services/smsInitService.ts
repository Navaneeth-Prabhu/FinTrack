// services/smsInitService.ts
// Uses the shared supabase client for auth + online detection.
// No external netinfo dependency required.

import { Platform, PermissionsAndroid } from 'react-native';
import { Category, Transaction } from '@/types';
import { importSMSTransactionsToStore } from '@/utils/SMSTransactionUtil';
import { supabase } from './supabaseClient';

export interface SMSInitOptions {
  categories: Category[];
  saveTransactionFn: (t: Transaction) => Promise<Transaction>;
}

/** Resolve current user ID from Supabase session (null if not logged in / offline) */
async function resolveUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Best-effort network check: try to reach Supabase. Falls back to true (optimistic). */
async function checkOnline(): Promise<boolean> {
  try {
    const res = await fetch(process.env.EXPO_PUBLIC_SUPABASE_URL + '/rest/v1/', {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000),
    });
    return res.status < 500;
  } catch {
    return false;
  }
}

/**
 * Initialize SMS features during app startup.
 */
export const initializeSMSFeatures = async (opts: SMSInitOptions): Promise<void> => {
  if (Platform.OS !== 'android') return;

  try {
    const hasPermission = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
    );
    if (!hasPermission) {
      console.log('[SMS::Init] Permission not granted');
      return;
    }

    const [userId, isOnline] = await Promise.all([resolveUserId(), checkOnline()]);
    console.log(`[SMS::Init] Starting scan — userId=${userId ? 'set' : 'none'} online=${isOnline}`);

    const count = await importSMSTransactionsToStore(
      opts.categories,
      opts.saveTransactionFn,
      userId,
      isOnline,
    );

    console.log(`[SMS::Init] Complete — ${count} transactions imported`);
  } catch (err) {
    console.error('[SMS::Init] Error:', err);
  }
};

// removed periodic scan setup -> superseded by real-time ContentObserver