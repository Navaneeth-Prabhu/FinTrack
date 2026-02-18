// services/smsService.ts
// SMS service — NO dependency on react-native-get-sms-android.
// Uses the custom SmsModule native module via nativeSmsModule.ts.

import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, Category } from '@/types';
import { extractTransactionDetails } from './smsParser';
import { readSmsMessages } from './nativeSmsModule';
import { convertToAppTransaction } from '@/utils/SMSTransactionUtil';

// ─── Storage keys ─────────────────────────────────────────────────────────────
const PROCESSED_SMS_KEY = 'processed_sms_ids';
const LAST_SMS_SCAN_KEY = 'last_sms_scan_timestamp';

// ─── Financial keywords ───────────────────────────────────────────────────────
const FINANCIAL_KEYWORDS = [
  'bank', 'credit', 'debit', 'transaction', 'account', 'spent',
  'payment', 'transfer', 'balance', 'card', 'upi', 'atm', 'paid',
  'hdfc', 'sbi', 'icici', 'axis', 'kotak', 'paytm', 'phonepe', 'gpay',
  'google pay', 'amazon pay', 'razorpay', 'credited', 'debited',
  'withdrawn', 'deposit', 'purchase', 'inr', 'rs', 'rupee', '₹',
  'refund', 'cashback', 'emi',
];

/**
 * Simple SMS Service for transaction detection.
 * Singleton — use SMSService.getInstance().
 */
class SMSService {
  private static instance: SMSService;

  public static getInstance(): SMSService {
    if (!SMSService.instance) SMSService.instance = new SMSService();
    return SMSService.instance;
  }

  public isSupported(): boolean {
    return Platform.OS === 'android';
  }

  // ── Permission ────────────────────────────────────────────────────────────
  public async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'SMS Reading Permission',
          message: 'This app needs to read your SMS messages to track expenses.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('[SMS] Error requesting permission:', error);
      return false;
    }
  }

  public async checkPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
    } catch (error) {
      console.error('[SMS] Error checking permission:', error);
      return false;
    }
  }

  // ── Processed IDs (deduplication) ─────────────────────────────────────────
  public async getProcessedSMSIds(): Promise<string[]> {
    try {
      const raw = await AsyncStorage.getItem(PROCESSED_SMS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public async saveProcessedSMSIds(ids: string[]): Promise<void> {
    try {
      const existing = await this.getProcessedSMSIds();
      const merged = [...new Set([...existing, ...ids])];
      await AsyncStorage.setItem(PROCESSED_SMS_KEY, JSON.stringify(merged));
    } catch (error) {
      console.error('[SMS] Error saving processed IDs:', error);
    }
  }

  // ── Read financial SMS ────────────────────────────────────────────────────
  public async readFinancialSMS(): Promise<any[]> {
    if (!this.isSupported()) return [];

    const hasPermission = await this.checkPermission();
    if (!hasPermission) return [];

    // Determine scan window
    let minDate = 0;
    try {
      const lastScanStr = await AsyncStorage.getItem(LAST_SMS_SCAN_KEY);
      minDate = lastScanStr
        ? parseInt(lastScanStr, 10)
        : Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago on first run
    } catch {
      minDate = Date.now() - 7 * 24 * 60 * 60 * 1000;
    }

    // Read from native module (already filtered to alphanumeric senders)
    const allMessages = await readSmsMessages(300, minDate);

    // Further filter by financial keywords in JS
    const financial = allMessages.filter(msg => {
      if (!msg.body) return false;
      const lower = msg.body.toLowerCase();
      return FINANCIAL_KEYWORDS.some(kw => lower.includes(kw));
    });

    console.log(`[SMS] ${allMessages.length} total → ${financial.length} financial`);

    // Exclude already-processed messages
    const processedIds = await this.getProcessedSMSIds();
    const newMessages = financial.filter(m => !processedIds.includes(m._id));

    console.log(`[SMS] ${newMessages.length} new messages to process`);

    // Update last scan time
    await AsyncStorage.setItem(LAST_SMS_SCAN_KEY, Date.now().toString());

    return newMessages;
  }

  // ── Date helper ───────────────────────────────────────────────────────────
  private combineExtractedDateWithSMSTime(extractedDateISO: string, smsTimestamp: number): Date {
    try {
      const contentDate = new Date(extractedDateISO);
      const messageTime = new Date(smsTimestamp);
      if (isNaN(contentDate.getTime()) || isNaN(messageTime.getTime())) return contentDate;
      return new Date(
        contentDate.getFullYear(), contentDate.getMonth(), contentDate.getDate(),
        messageTime.getHours(), messageTime.getMinutes(), messageTime.getSeconds(),
      );
    } catch {
      return new Date(extractedDateISO);
    }
  }

  // ── Parse SMS into transactions ───────────────────────────────────────────
  public async getTransactionsFromSMS(): Promise<any[]> {
    try {
      const messages = await this.readFinancialSMS();
      const transactions: any[] = [];

      for (const message of messages) {
        const details = extractTransactionDetails(message.body, message.address);
        if (!details) continue;

        let transactionDate: string;
        if (details.date && message.date) {
          transactionDate = this.combineExtractedDateWithSMSTime(details.date, message.date).toISOString();
        } else if (details.date) {
          transactionDate = details.date;
        } else if (message.date) {
          transactionDate = new Date(message.date).toISOString();
        } else {
          transactionDate = new Date().toISOString();
        }

        transactions.push({
          ...details,
          date: transactionDate,
          dateStr: details.dateStr || 'Unknown date',
          sender: details.sender || message.address,
          smsId: message._id,
          rawSMS: message.body,
        });
      }

      console.log(`[SMS] Extracted ${transactions.length} transactions`);

      if (transactions.length > 0) {
        const ids = transactions.map(t => t.smsId).filter(Boolean);
        await this.saveProcessedSMSIds(ids);
      }

      return transactions;
    } catch (error) {
      console.error('[SMS] Error getting transactions:', error);
      return [];
    }
  }

  // ── Import to store ───────────────────────────────────────────────────────
  public async importTransactionsToStore(
    categories: Category[],
    saveTransactionFn: (t: Transaction) => Promise<Transaction>,
  ): Promise<number> {
    try {
      const hasPermission = await this.checkPermission();
      if (!hasPermission) {
        const granted = await this.requestPermission();
        if (!granted) return 0;
      }

      const transactions = await this.getTransactionsFromSMS();
      let savedCount = 0;

      for (const transaction of transactions) {
        try {
          const appTransaction = convertToAppTransaction(transaction, categories);
          await saveTransactionFn(appTransaction);
          savedCount++;
        } catch (err) {
          console.error('[SMS] Error saving transaction:', err);
        }
      }

      console.log(`[SMS] Imported ${savedCount} transactions`);
      return savedCount;
    } catch (error) {
      console.error('[SMS] Error importing transactions:', error);
      return 0;
    }
  }

  public async performPeriodicScan(
    categories: Category[],
    saveTransactionFn: (t: Transaction) => Promise<Transaction>,
  ): Promise<number> {
    return this.importTransactionsToStore(categories, saveTransactionFn);
  }
}

export default SMSService.getInstance();