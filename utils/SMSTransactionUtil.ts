// utils/SMSTransactionUtil.ts
// Converts parsed SMS transactions → app Transaction format.
// Uses the 3-tier smsCategorizationService for intelligent categorization.

import { getTransactionsFromSMS, ParsedSMS } from '@/services/smsParser';
import {
  categorizeWithContext,
  CategorizationOptions,
  getSMSAIPreference,
} from '@/services/smsCategorizationService';
import { Category, Transaction } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Storage keys ─────────────────────────────────────────────────────────────
const PROCESSED_SMS_IDS_KEY = 'processed_sms_ids';

// ─── Deduplication helpers ────────────────────────────────────────────────────
export const getProcessedSMSIds = async (): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(PROCESSED_SMS_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveProcessedSMSIds = async (ids: string[]): Promise<void> => {
  try {
    const existing = await getProcessedSMSIds();
    const merged = [...new Set([...existing, ...ids])];
    // Keep only the newest 5000 IDs to avoid unbounded storage growth
    const trimmed = merged.slice(-5000);
    await AsyncStorage.setItem(PROCESSED_SMS_IDS_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('[SMS::Util] Error saving processed IDs:', err);
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
  if (parsed.accountLast4) return `••••${parsed.accountLast4}`;
  const body = (parsed.rawSMS ?? '').toLowerCase();
  const sender = (parsed.sender ?? '').toLowerCase();
  const combined = `${sender} ${body}`;
  if (combined.includes('hdfc')) return 'HDFC Bank';
  if (combined.includes('icici')) return 'ICICI Bank';
  if (combined.includes('sbi') || combined.includes('onlsbi')) return 'SBI';
  if (combined.includes('axis')) return 'Axis Bank';
  if (combined.includes('kotak')) return 'Kotak Mahindra';
  if (combined.includes('paytm')) return 'Paytm';
  if (combined.includes('phonepe')) return 'PhonePe';
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
    source: {
      type: 'sms',
      rawData: parsed.rawSMS,
    },
    mode: resolvePaymentMode(parsed),
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

    const smsTransactions = await getTransactionsFromSMS();
    if (smsTransactions.length === 0) return [];

    const processedIds = await getProcessedSMSIds();
    console.log(`[SMS::Util] Raw: ${smsTransactions.length}, Processed: ${processedIds.length}`);

    const newTransactions = force
      ? smsTransactions
      : smsTransactions.filter(t => t.smsId && !processedIds.includes(t.smsId));

    if (newTransactions.length === 0) {
      console.log('[SMS::Util] No new SMS transactions.');
      return [];
    }

    console.log(`[SMS::Util] Converting ${newTransactions.length} new transactions...`);

    // Convert sequentially to avoid hammering the DB/AI with concurrent requests
    const appTransactions: Transaction[] = [];
    for (const t of newTransactions) {
      const tx = await convertToAppTransaction(t, categories, options);
      appTransactions.push(tx);
    }

    // Mark as processed
    const newIds = newTransactions.map(t => t.smsId).filter(Boolean) as string[];
    await saveProcessedSMSIds(newIds);

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