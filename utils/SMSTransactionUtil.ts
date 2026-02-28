// utils/SMSTransactionUtil.ts
// Converts parsed SMS transactions → app Transaction format.
// Uses the 3-tier smsCategorizationService for intelligent categorization.

import { getTransactionsFromSMS, ParsedSMS } from '@/services/smsParser';
import {
  categorizeWithContext,
  CategorizationOptions,
  getSMSAIPreference,
} from '@/services/smsCategorizationService';
import { Category, Transaction, Account } from '@/types';
import { useAccountStore } from '@/stores/accountStore';
import { supabase } from '@/services/supabaseClient';
import {
  getProcessedSmsIdsFromDb,
  saveProcessedSmsIdsToDb,
  getSmsWatermarkFromDb,
  setSmsWatermarkInDb
} from '@/db/services/sqliteService';

// ─── Deduplication / Watermark helpers ─────────────────────────────────────────

/** Gets the timestamp of the newest processed SMS */
export const getSmsWatermark = async (): Promise<number> => {
  return await getSmsWatermarkFromDb();
};

/**
 * Updates the watermark timestamp.
 * Only advances forward. Never goes backwards.
 */
export const updateSmsWatermark = async (newDateTs: number): Promise<void> => {
  if (!newDateTs || isNaN(newDateTs)) return;
  try {
    const current = await getSmsWatermarkFromDb();
    if (newDateTs > current) {
      await setSmsWatermarkInDb(newDateTs);
      console.log(`[SMS::Watermark] Advanced to ${new Date(newDateTs).toISOString()}`);
    }
  } catch (err) {
    console.error('[SMS::Watermark] Error updating watermark:', err);
  }
};

// ─── Payment method detection ──────────────────────────────────────────────────
function resolvePaymentMode(parsed: ParsedSMS & { smsId?: string }): string {
  if (parsed.paymentMethod) return parsed.paymentMethod;
  const body = (parsed.rawSMS ?? '').toLowerCase();
  if (body.includes('upi') || body.includes('vpa')) return 'UPI';
  if (body.includes('credit card')) return 'Credit Card';
  if (body.includes('debit card')) return 'Debit Card';
  if (body.includes('imps')) return 'IMPS';
  if (body.includes('neft')) return 'NEFT';
  if (body.includes('rtgs')) return 'RTGS';
  if (body.includes('net banking') || body.includes('netbanking')) return 'Net Banking';
  if (body.includes('wallet') || body.includes('paytm') || body.includes('phonepe')) return 'Wallet';
  if (body.includes('atm') || body.includes('cash')) return 'Cash';
  return 'Other';
}

// ─── Bank identification from parsed data ──────────────────────────────────────
function resolveAccount(parsed: ParsedSMS & { smsId?: string }): string | undefined {
  if (parsed.bank && parsed.accountLast4) return `${parsed.bank} ••••${parsed.accountLast4}`;
  if (parsed.bank) return parsed.bank;

  const body = (parsed.rawSMS ?? '').toLowerCase();
  const sender = (parsed.sender ?? '').toLowerCase();
  const combined = `${sender} ${body}`;

  let detectedBank: string | undefined = undefined;
  if (combined.includes('hdfc')) detectedBank = 'HDFC Bank';
  else if (combined.includes('icici')) detectedBank = 'ICICI Bank';
  else if (combined.includes('sbi') || combined.includes('onlsbi')) detectedBank = 'SBI';
  else if (combined.includes('axis')) detectedBank = 'Axis Bank';
  else if (combined.includes('kotak')) detectedBank = 'Kotak Mahindra';
  else if (combined.includes('paytm')) detectedBank = 'Paytm';
  else if (combined.includes('phonepe')) detectedBank = 'PhonePe';
  else if (combined.includes('kerala gramin') || combined.includes('kgbank')) detectedBank = 'Kerala Gramin Bank';

  if (detectedBank) {
    parsed.bank = detectedBank;
    if (parsed.accountLast4) return `${detectedBank} ••••${parsed.accountLast4}`;
    return detectedBank;
  }

  if (parsed.accountLast4) return `••••${parsed.accountLast4}`;
  return undefined;
}

// ─── Convert a single parsed SMS to app Transaction ────────────────────────────
export const convertToAppTransaction = async (
  parsed: ParsedSMS & { smsId?: string; date: string },
  categories: Category[],
  options: CategorizationOptions,
): Promise<Transaction> => {
  const now = new Date().toISOString();

  // Categorize — uses raw SMS body for extra context if merchant alone doesn't match
  const categoryResult = await categorizeWithContext(
    parsed.merchant,
    parsed.rawSMS,
    parsed.amount,
    parsed.type,
    categories,
    options,
  );

  const matchedCategory: Category = categories.find(c => c.id === categoryResult.categoryId) ?? {
    id: categoryResult.categoryId ?? (parsed.type === 'income' ? 'other_income' : 'other_expense'),
    name: categoryResult.categoryName,
    icon: '❗',
    color: '#888888',
    type: parsed.type === 'income' ? 'income' : 'expense',
  };

  // ── Auto-create and Link Account ──
  let linkedAccount: Account | undefined = undefined;
  const accountName = resolveAccount(parsed);

  if (accountName && !['Unknown', 'Other', 'UPI', 'Cash'].includes(accountName)) {
    const accountStore = useAccountStore.getState();
    // 1. Try to find the exact account in the store by name
    linkedAccount = accountStore.accounts.find(a =>
      a.name.toLowerCase() === accountName.toLowerCase() ||
      (a.accountNumber && accountName.includes(a.accountNumber))
    );

    // 2. If it doesn't exist locally, auto-create it
    if (!linkedAccount) {
      const newAccount: Account = {
        id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: accountName,
        type: 'bank',
        balance: 0,
        currency: 'INR',
        isIncludeInNetWorth: true,
        color: '#ABDF75', // Default green-ish bank color
        icon: '🏦', // Default bank icon
        provider: parsed.bank ?? 'Unknown Bank',
        accountNumber: parsed.accountLast4 ?? undefined,
      };

      try {
        linkedAccount = await accountStore.addAccount(newAccount);
        console.log(`[SMS::Account] Auto-created new account locally: ${newAccount.name}`);

        // ── Push to Supabase optionally if online ──
        if (options.isOnline && options.userId) {
          const { error } = await supabase.from('accounts').insert({
            id: newAccount.id, // Or omit if UUID is assigned by Supabase
            user_id: options.userId,
            type: 'bank',
            provider: newAccount.provider,
            account_number: newAccount.accountNumber,
            account_name: newAccount.name,
            balance: newAccount.balance,
            currency: newAccount.currency,
            metadata: {
              color: newAccount.color,
              icon: newAccount.icon,
              isIncludeInNetWorth: newAccount.isIncludeInNetWorth
            }
          });
          if (error) {
            console.error('[SMS::Account] Error syncing auto-created account to Supabase:', error);
          } else {
            console.log(`[SMS::Account] Successfully synced account to Supabase: ${newAccount.name}`);
          }
        }
      } catch (err) {
        console.error('[SMS::Account] Error creating account automatically:', err);
      }
    } else {
      console.log(`[SMS::Account] Found existing account: ${linkedAccount.name}`);
    }
  }

  return {
    id: `sms_${parsed.smsId ?? Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    amount: parsed.amount,
    type: parsed.type,
    date: parsed.date,
    createdAt: now,
    lastModified: now,
    paidTo: parsed.type !== 'income' ? (parsed.merchant ?? 'Unknown') : undefined,
    paidBy: parsed.type === 'income' ? (parsed.merchant ?? parsed.sender) : resolveAccount(parsed),
    category: matchedCategory,
    fromAccount: parsed.type !== 'income' ? linkedAccount : undefined,
    toAccount: parsed.type === 'income' ? linkedAccount : undefined,
    source: {
      type: 'sms',
      rawData: parsed.rawSMS,
    },
    mode: resolvePaymentMode(parsed),
    refNumber: parsed.refNumber ?? undefined,
    note: [
      `Auto-import from SMS`,
      parsed.bank ? `Bank: ${parsed.bank}` : null,
      parsed.accountLast4 ? `A/c: ••••${parsed.accountLast4}` : null,
      `Source: ${parsed.sender ?? 'Unknown'}`,
    ].filter(Boolean).join(' | '),
  };
};

// ─── Main: get new transactions from SMS ──────────────────────────────────────
export const getNewTransactionsFromSMS = async (
  categories: Category[],
  userId: string | null,
  isOnline: boolean,
  force = false,
): Promise<Transaction[]> => {
  try {
    const aiEnabled = await getSMSAIPreference();
    const options: CategorizationOptions = { aiEnabled, isOnline, userId };

    const watermark = force ? 0 : await getSmsWatermarkFromDb();
    console.log(`[SMS::Util] Fetching from watermark: ${watermark > 0 ? new Date(watermark).toISOString() : 'beginning'}`);

    // If we have a watermark, only grab messages newer than it.
    // We add a tiny 1ms buffer to avoid re-fetching the exact last message.
    const minDate = watermark > 0 && !force ? watermark + 1 : 0;

    // The parser now accepts minDate to pass down to native ContentResolver.
    const smsTransactions = await getTransactionsFromSMS(minDate);

    if (smsTransactions.length === 0) {
      console.log('[SMS::Util] No new SMS transactions.');
      return [];
    }

    // Get ALL historically processed IDs from SQLite (fast O(1) loop filter)
    const processedIds = await getProcessedSmsIdsFromDb();

    const newTransactions = force
      ? smsTransactions
      : smsTransactions.filter(t => t.smsId && !processedIds.includes(t.smsId));

    if (newTransactions.length === 0) {
      console.log('[SMS::Util] No un-processed SMS transactions after dedup.');
      return [];
    }

    // Filter by confidence *before* running AI conversion
    const MIN_CONFIDENCE_THRESHOLD = 0.35;
    const highConfidenceTransactions = newTransactions.filter(t => t.confidence >= MIN_CONFIDENCE_THRESHOLD);

    console.log(`[SMS::Util] Converting ${highConfidenceTransactions.length} new transactions (filtered out ${newTransactions.length - highConfidenceTransactions.length} low confidence)`);

    // Process all high-confidence transactions in parallel using Promise.all
    const conversionPromises = highConfidenceTransactions.map(async t => {
      const tx = await convertToAppTransaction(t, categories, options);
      return { tx, smsId: t.smsId, date: t.date };
    });

    const conversionResults = await Promise.all(conversionPromises);

    const appTransactions: Transaction[] = [];
    const newlyProcessedIds: string[] = [];
    let maxDateProcessed = watermark;

    for (const res of conversionResults) {
      appTransactions.push(res.tx);
      if (res.smsId) newlyProcessedIds.push(res.smsId);

      const txDateTs = new Date(res.date).getTime();
      if (txDateTs > maxDateProcessed) {
        maxDateProcessed = txDateTs;
      }
    }

    // Update watermark to the newest SMS we just processed
    if (maxDateProcessed > watermark) {
      await updateSmsWatermark(maxDateProcessed);
    }

    // Permanently save the individual IDs to SQLite as an extra layer of protection
    if (newlyProcessedIds.length > 0) {
      await saveProcessedSmsIdsToDb(newlyProcessedIds);
    }

    return appTransactions;
  } catch (err) {
    console.error('[SMS::Util] Error getting transactions:', err);
    return [];
  }
};

// ─── Import to store ───────────────────────────────────────────────────────────
export const importSMSTransactionsToStore = async (
  categories: Category[],
  saveTransactionFn: (t: Transaction) => Promise<Transaction>,
  userId: string | null = null,
  isOnline = true,
  force = false,
): Promise<number> => {
  try {
    const transactions = await getNewTransactionsFromSMS(categories, userId, isOnline, force);

    let savedCount = 0;
    for (const tx of transactions) {
      try {
        await saveTransactionFn(tx);
        savedCount++;
      } catch (err) {
        console.error('[SMS::Util] Save error for tx:', tx.id, err);
      }
    }

    console.log(`[SMS::Util] Saved ${savedCount}/${transactions.length} transactions`);
    return savedCount;
  } catch (err) {
    console.error('[SMS::Util] Import error:', err);
    return 0;
  }
};