// src/services/smsService.ts
import { Platform } from 'react-native';
import { PermissionsAndroid } from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, Category } from '@/types';
import { extractTransactionDetails } from './smsParser';
import { convertToAppTransaction } from '@/utils/SMSTransactionUtil';

// Storage keys
const PROCESSED_SMS_KEY = 'processed_sms_ids';
const LAST_SMS_SCAN_KEY = 'last_sms_scan_timestamp';

/**
 * Simple SMS Service for transaction detection
 */
class SMSService {
  private static instance: SMSService;

  constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the SMS service instance (singleton)
   */
  public static getInstance(): SMSService {
    if (!SMSService.instance) {
      SMSService.instance = new SMSService();
    }
    return SMSService.instance;
  }

  /**
   * Check if the device supports SMS features
   */
  public isSupported(): boolean {
    return Platform.OS === 'android';
  }

  /**
   * Request READ_SMS permission
   */
  public async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: "SMS Reading Permission",
          message: "This app needs to read your SMS messages to track expenses.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK"
        }
      );

      const success = granted === PermissionsAndroid.RESULTS.GRANTED;
      console.log('SMS permission granted:', success);
      return success;
    } catch (error) {
      console.error('Error requesting SMS permission:', error);
      return false;
    }
  }

  /**
   * Check if READ_SMS permission is granted
   */
  public async checkPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
    } catch (error) {
      console.error('Error checking SMS permission:', error);
      return false;
    }
  }

  /**
   * Get processed SMS IDs
   */
  public async getProcessedSMSIds(): Promise<string[]> {
    try {
      const idsString = await AsyncStorage.getItem(PROCESSED_SMS_KEY);
      return idsString ? JSON.parse(idsString) : [];
    } catch (error) {
      console.error('Error getting processed SMS IDs:', error);
      return [];
    }
  }

  /**
   * Save processed SMS IDs
   */
  public async saveProcessedSMSIds(ids: string[]): Promise<boolean> {
    try {
      const existingIds = await this.getProcessedSMSIds();
      const allIds = [...new Set([...existingIds, ...ids])];
      await AsyncStorage.setItem(PROCESSED_SMS_KEY, JSON.stringify(allIds));
      return true;
    } catch (error) {
      console.error('Error saving processed SMS IDs:', error);
      return false;
    }
  }

  /**
   * Read financial SMS messages
   */
  public async readFinancialSMS(): Promise<any[]> {
    if (!this.isSupported()) return [];

    // Check permission
    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      console.log('SMS permission not granted');
      return [];
    }

    // Get the last scan time or default to 30 days ago
    let lastScan = 0;
    try {
      const lastScanStr = await AsyncStorage.getItem(LAST_SMS_SCAN_KEY);
      if (lastScanStr) {
        lastScan = parseInt(lastScanStr, 10);
      } else {
        // Default to 30 days ago for first run
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        lastScan = thirtyDaysAgo;
      }
    } catch (error) {
      console.error('Error getting last scan time:', error);
      // Default to 7 days ago if there's an error
      lastScan = Date.now() - (7 * 24 * 60 * 60 * 1000);
    }

    // Keywords to filter for financial messages
    const keywordsStr = 'bank,credit,debit,transaction,account,spent,payment,transfer,balance,card,upi,atm,paid,hdfc,sbi,icici,axis,kotak,paytm,phonepe,gpay,google pay,amazon pay,razorpay,credited,debited,transfered,withdrawn,deposit,purchase,statement,inr,rs,rupee,₹,merchant,shopping,refund,cashback,emi';

    // Filter configuration
    const filter = {
      box: 'inbox',
      maxCount: 300,
      minDate: lastScan,
      bodyContains: keywordsStr.split(',')
    };

    return new Promise((resolve, reject) => {
      SmsAndroid.list(
        JSON.stringify(filter),
        (fail) => {
          console.error('Failed to read SMS:', fail);
          reject(fail);
        },
        async (count, smsList) => {
          if (count === 0) {
            console.log('No new SMS messages found');
            resolve([]);
            return;
          }

          try {
            const messages = JSON.parse(smsList);
            console.log(`Found ${messages.length} SMS messages, filtering for financial content...`);

            // Get processed SMS IDs to avoid duplicates
            const processedIds = await this.getProcessedSMSIds();

            // Filter out already processed messages
            const newMessages = messages.filter(msg => !processedIds.includes(msg._id));

            console.log(`Found ${newMessages.length} new SMS messages to process`);

            // Log a few for debugging
            newMessages.slice(0, 5).forEach((message, index) => {
              console.log(`SMS #${index + 1}:`);
              console.log(`- From: ${message.address}`);
              console.log(`- Date: ${new Date(parseInt(message.date)).toLocaleString()}`);
              console.log(`- Body: ${message.body}`);
            });

            // Store the current time as last scan time
            await AsyncStorage.setItem(LAST_SMS_SCAN_KEY, Date.now().toString());

            resolve(newMessages);
          } catch (error) {
            console.error('Error processing SMS messages:', error);
            reject(error);
          }
        }
      );
    });
  }

  /**
   * Get transactions from SMS
   */
  /**
   * Helper function to combine date from SMS content with time from SMS timestamp
   * This gives us the correct transaction date with a reasonable time
   */
  private combineExtractedDateWithSMSTime(extractedDateISO: string, smsTimestamp: number): Date {
    try {
      // Create Date objects for both
      const contentDate = new Date(extractedDateISO);
      const messageTime = new Date(smsTimestamp);

      // Validate both dates are valid
      if (isNaN(contentDate.getTime()) || isNaN(messageTime.getTime())) {
        console.warn('Invalid date encountered when combining dates');
        return contentDate; // Fallback to content date
      }

      // Create a new date with the date part from content and time part from SMS timestamp
      const combined = new Date(
        contentDate.getFullYear(),
        contentDate.getMonth(),
        contentDate.getDate(),
        messageTime.getHours(),
        messageTime.getMinutes(),
        messageTime.getSeconds()
      );

      return combined;
    } catch (error) {
      console.error('Error combining dates:', error);
      return new Date(extractedDateISO); // Fallback to content date
    }
  }

  /**
   * Get transactions from SMS
   */
  public async getTransactionsFromSMS(): Promise<any[]> {
    try {
      const messages = await this.readFinancialSMS();

      const transactions = [];
      for (const message of messages) {
        const details = extractTransactionDetails(message.body, message.address);
        if (details) {
          // IMPROVED: Better date and time handling with priority system
          let transactionDate: string;

          if (details.date && message.date) {
            // Best case: Combine date from SMS content with time from SMS timestamp
            const combined = this.combineExtractedDateWithSMSTime(details.date, parseInt(message.date));
            transactionDate = combined.toISOString();
            console.log(`Using combined date+time: ${new Date(transactionDate).toLocaleString()}`);
          } else if (details.date) {
            // Second best: Use date extracted from SMS content (but time will be 00:00:00)
            transactionDate = details.date;
            console.log(`Using SMS content date: ${new Date(transactionDate).toLocaleString()}`);
          } else if (message.date) {
            // Third best: Use SMS timestamp if no date in content
            transactionDate = new Date(parseInt(message.date)).toISOString();
            console.log(`Using SMS timestamp: ${new Date(transactionDate).toLocaleString()}`);
          } else {
            // Last resort: use current date and time
            transactionDate = new Date().toISOString();
            console.log(`Using current date as fallback: ${new Date(transactionDate).toLocaleString()}`);
          }

          transactions.push({
            ...details,
            date: transactionDate, // Now with better date+time handling
            dateStr: details.dateStr || 'Unknown date',
            sender: details.sender || message.address,
            smsId: message._id,
            rawSMS: message.body
          });
        }
      }

      console.log(`Extracted ${transactions.length} transactions from SMS`);

      // Mark these SMS as processed
      if (transactions.length > 0) {
        const processedIds = transactions.map(t => t.smsId).filter(Boolean);
        await this.saveProcessedSMSIds(processedIds);
      }

      return transactions;
    } catch (error) {
      console.error('Error getting transactions from SMS:', error);
      return [];
    }
  }

  /**
   * Import transactions from SMS and save them to the store
   */
  public async importTransactionsToStore(
    categories: Category[],
    saveTransactionFn: (transaction: Transaction) => Promise<Transaction>
  ): Promise<number> {
    try {
      // Check permission
      const hasPermission = await this.checkPermission();
      if (!hasPermission) {
        const granted = await this.requestPermission();
        if (!granted) return 0;
      }

      // Get transactions from SMS
      const transactions = await this.getTransactionsFromSMS();

      let savedCount = 0;
      if (transactions.length > 0) {
        for (const transaction of transactions) {
          try {
            // Convert to app transaction format
            console.log('Converting transaction:', transaction);
            const appTransaction = convertToAppTransaction(transaction, categories);

            // Save to store
            await saveTransactionFn(appTransaction);
            savedCount++;
          } catch (saveError) {
            console.error('Error saving transaction:', saveError);
          }
        }
      }

      console.log(`Successfully imported ${savedCount} transactions from SMS`);
      return savedCount;
    } catch (error) {
      console.error('Error importing SMS transactions to store:', error);
      return 0;
    }
  }

  /**
   * Perform a periodic scan for new SMS messages
   * You can call this periodically to catch new messages
   */
  public async performPeriodicScan(
    categories: Category[],
    saveTransactionFn: (transaction: Transaction) => Promise<Transaction>
  ): Promise<number> {
    return await this.importTransactionsToStore(categories, saveTransactionFn);
  }
}

// Export singleton instance
export default SMSService.getInstance();