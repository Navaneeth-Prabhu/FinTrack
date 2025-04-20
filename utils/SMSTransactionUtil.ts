// SMSTransactionUtil.js
import { getTransactionsFromSMS } from '@/services/smsParser';
import { Category } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys for AsyncStorage
const PROCESSED_SMS_IDS_KEY = 'processed_sms_ids';

// Get already processed SMS IDs
export const getProcessedSMSIds = async () => {
  try {
    const idsString = await AsyncStorage.getItem(PROCESSED_SMS_IDS_KEY);
    return idsString ? JSON.parse(idsString) : [];
  } catch (error) {
    console.error('Error getting processed SMS IDs:', error);
    return [];
  }
};

// Save processed SMS IDs
export const saveProcessedSMSIds = async (ids) => {
  try {
    const existingIds = await getProcessedSMSIds();
    const allIds = [...new Set([...existingIds, ...ids])];
    await AsyncStorage.setItem(PROCESSED_SMS_IDS_KEY, JSON.stringify(allIds));
  } catch (error) {
    console.error('Error saving processed SMS IDs:', error);
  }
};

// Convert an SMS transaction to your app's transaction format
export const convertToAppTransaction = (smsTransaction, categories) => {
  // Get current date/time as ISO string for metadata creation timestamps
  const now = new Date().toISOString();

  // CRITICAL: Use the extracted date from SMS as the transaction date
  // This is the actual date when the transaction occurred
  const transactionDate = smsTransaction.date || now;

  // Log date information for debugging
  if (smsTransaction.dateStr) {
    console.log(`Converting SMS transaction to app format: ${smsTransaction.dateStr}`);
    if (smsTransaction.date) {
      console.log(`Extracted date: ${new Date(smsTransaction.date).toLocaleString()}`);
    } else {
      console.log(`No date extracted from SMS, using fallback`);
    }
  }

  // Find appropriate category
  const findCategory = () => {
    const type = smsTransaction.type || 'expense';

    // Default to "Other" category
    const defaultCategory = categories.find(c => c.name.toLowerCase() === 'other' && c.type === type) ||
      categories.find(c => c.id === '101');

    if (!smsTransaction.merchant) return defaultCategory;

    const merchant = smsTransaction.merchant.toLowerCase();

    // Try to match merchant to category
    // Food
    if (
      merchant.includes('restaurant') ||
      merchant.includes('food') ||
      merchant.includes('cafe') ||
      merchant.includes('swiggy') ||
      merchant.includes('zomato') ||
      merchant.includes('hotel') ||
      merchant.includes('dining') ||
      merchant.includes('pizza') ||
      merchant.includes('burger')
    ) {
      const foodCategory = categories.find(c => c.name === 'Food' && c.type === type);
      if (foodCategory) return foodCategory;
    }

    // Groceries
    if (
      merchant.includes('mart') ||
      merchant.includes('grocer') ||
      merchant.includes('super') ||
      merchant.includes('market') ||
      merchant.includes('store') ||
      merchant.includes('shop') ||
      merchant.includes('big basket') ||
      merchant.includes('bigbasket') ||
      merchant.includes('d-mart') ||
      merchant.includes('reliance fresh')
    ) {
      const groceryCategory = categories.find(c => c.name === 'Groceries' && c.type === type);
      if (groceryCategory) return groceryCategory;
    }

    // Travel
    if (
      merchant.includes('travel') ||
      merchant.includes('uber') ||
      merchant.includes('ola') ||
      merchant.includes('flight') ||
      merchant.includes('train') ||
      merchant.includes('metro') ||
      merchant.includes('taxi') ||
      merchant.includes('cab') ||
      merchant.includes('rapido') ||
      merchant.includes('irctc') ||
      merchant.includes('airline') ||
      merchant.includes('airways') ||
      merchant.includes('bus') ||
      merchant.includes('ticket')
    ) {
      const travelCategory = categories.find(c => c.name === 'Travelling' && c.type === type);
      if (travelCategory) return travelCategory;
    }

    // Shopping
    if (
      merchant.includes('amazon') ||
      merchant.includes('myntra') ||
      merchant.includes('flipkart') ||
      merchant.includes('ajio') ||
      merchant.includes('retail') ||
      merchant.includes('shop') ||
      merchant.includes('store') ||
      merchant.includes('mall') ||
      merchant.includes('fashion') ||
      merchant.includes('clothing') ||
      merchant.includes('apparel')
    ) {
      const shoppingCategory = categories.find(c => c.name === 'Shopping' && c.type === type);
      if (shoppingCategory) return shoppingCategory;
    }

    // Entertainment
    if (
      merchant.includes('movie') ||
      merchant.includes('game') ||
      merchant.includes('netflix') ||
      merchant.includes('amazon prime') ||
      merchant.includes('entertainment') ||
      merchant.includes('cinema') ||
      merchant.includes('theater') ||
      merchant.includes('pvr') ||
      merchant.includes('hotstar') ||
      merchant.includes('disney+') ||
      merchant.includes('bookmyshow')
    ) {
      const entertainmentCategory = categories.find(c => c.name === 'Entertainment' && c.type === type);
      if (entertainmentCategory) return entertainmentCategory;
    }

    // Bills
    if (
      merchant.includes('bill') ||
      merchant.includes('electric') ||
      merchant.includes('water') ||
      merchant.includes('gas') ||
      merchant.includes('broadband') ||
      merchant.includes('phone') ||
      merchant.includes('mobile') ||
      merchant.includes('utility') ||
      merchant.includes('recharge') ||
      merchant.includes('jio') ||
      merchant.includes('airtel') ||
      merchant.includes('vi') ||
      merchant.includes('vodafone') ||
      merchant.includes('tata sky') ||
      merchant.includes('dish tv')
    ) {
      const billsCategory = categories.find(c => c.name === 'Bills & Utilities' && c.type === type);
      if (billsCategory) return billsCategory;
    }

    // Health
    if (
      merchant.includes('hospital') ||
      merchant.includes('clinic') ||
      merchant.includes('doctor') ||
      merchant.includes('medical') ||
      merchant.includes('pharmacy') ||
      merchant.includes('medicine') ||
      merchant.includes('health') ||
      merchant.includes('apollo') ||
      merchant.includes('max') ||
      merchant.includes('fortis')
    ) {
      const healthCategory = categories.find(c => c.name === 'Health' && c.type === type);
      if (healthCategory) return healthCategory;
    }

    return defaultCategory;
  };

  // Guess payment mode with more options
  const guessPaymentMode = () => {
    const body = smsTransaction.rawSMS?.toLowerCase() || '';

    if (body.includes('upi')) return 'UPI';
    if (body.includes('card') || body.includes('credit') || body.includes('debit')) return 'Card';
    if (body.includes('atm') || body.includes('cash')) return 'Cash';
    if (body.includes('imps')) return 'IMPS';
    if (body.includes('neft')) return 'NEFT';
    if (body.includes('rtgs')) return 'RTGS';
    if (body.includes('net banking') || body.includes('netbanking')) return 'Net Banking';
    if (body.includes('wallet') || body.includes('paytm') || body.includes('phonepe')) return 'Wallet';

    return 'Other';
  };

  // Guess the account from the SMS
  const guessAccount = () => {
    const body = smsTransaction.rawSMS?.toLowerCase() || '';
    const sender = smsTransaction.sender?.toLowerCase() || '';

    // Try to identify the bank/account
    if (sender.includes('hdfc') || body.includes('hdfc')) return 'HDFC';
    if (sender.includes('sbi') || body.includes('sbi')) return 'SBI';
    if (sender.includes('icici') || body.includes('icici')) return 'ICICI';
    if (sender.includes('axis') || body.includes('axis')) return 'Axis';
    if (sender.includes('kotak') || body.includes('kotak')) return 'Kotak';
    if (sender.includes('paytm') || body.includes('paytm')) return 'Paytm';
    if (sender.includes('phonepe') || body.includes('phonepe')) return 'PhonePe';

    return undefined;
  };

  return {
    id: new Date().getTime().toString(), // Unique ID based on timestamp
    amount: smsTransaction.amount,
    type: smsTransaction.type,
    date: transactionDate, // Use extracted date from SMS
    createdAt: now,
    lastModified: now,
    paidTo: smsTransaction.merchant || 'Unknown',
    paidBy: guessAccount() || smsTransaction.sender || undefined,
    category: findCategory(),
    source: {
      type: 'sms',
      rawData: smsTransaction.rawSMS,
    },
    mode: guessPaymentMode(),
    note: `Auto-import from SMS: ${smsTransaction.dateStr || 'Unknown date'} - ${smsTransaction.rawSMS?.substring(0, 50)}...`,
  };
};

// Get new transactions from SMS and convert to app format
export const getNewTransactionsFromSMS = async (categories: Category[]) => {
  try {
    // Get transactions from SMS
    const smsTransactions = await getTransactionsFromSMS();
    if (smsTransactions.length === 0) {
      return [];
    }

    // Get already processed SMS IDs
    const processedIds = await getProcessedSMSIds();

    // Filter out already processed SMS
    const newTransactions = smsTransactions.filter(
      t => t.smsId && !processedIds.includes(t.smsId)
    );

    if (newTransactions.length === 0) {
      console.log('No new SMS transactions found');
      return [];
    }

    console.log(`Found ${newTransactions.length} new SMS transactions`);

    // Convert to app transactions
    const appTransactions = newTransactions.map(t =>
      convertToAppTransaction(t, categories)
    );

    // Save processed SMS IDs
    const newSmsIds = newTransactions.map(t => t.smsId).filter(Boolean);
    await saveProcessedSMSIds(newSmsIds);

    return appTransactions;
  } catch (error) {
    console.error('Error getting new transactions from SMS:', error);
    return [];
  }
};

// Import new SMS transactions directly to the transaction store
export const importSMSTransactionsToStore = async (
  categories,
  saveTransactionFn // This should be the saveTransaction function from your store
) => {
  try {
    const transactions = await getNewTransactionsFromSMS(categories);

    let savedCount = 0;
    if (transactions.length > 0) {
      for (const transaction of transactions) {
        try {
          await saveTransactionFn(transaction);
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
};