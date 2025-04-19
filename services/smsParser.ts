// // SMSParserService.js
// import SmsAndroid from 'react-native-get-sms-android';
// import * as Permissions from 'expo-permissions';
// import * as TaskManager from 'expo-task-manager';
// import * as BackgroundFetch from 'expo-background-fetch';

// const BACKGROUND_FETCH_TASK = 'background-sms-fetch';
// const SMS_FILTER_BANKS = [
//   'bank', 'credit', 'debit', 'transaction', 'purchase', 'spent',
//   'payment', 'card', 'account', 'transfer', 'paid'
// ];

// // Bank-specific identifiers - expand this list based on your target banks
// const BANK_SENDERS = [
//   'HDFCBK', 'ICICIB', 'SBIINB', 'AXISBK', 'CENTBK', 'BOIIND',
//   // Add more bank SMS IDs as needed
// ];

// // Register background task
// TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
//   try {
//     const newTransactions = await fetchSMSTransactions();
//     // Process transactions and send to storage
//     if (newTransactions.length > 0) {
//       await storeTransactions(newTransactions);
//       return BackgroundFetch.BackgroundFetchResult.NewData;
//     }
//     return BackgroundFetch.BackgroundFetchResult.NoData;
//   } catch (error) {
//     console.error('Error in background SMS fetch:', error);
//     return BackgroundFetch.BackgroundFetchResult.Failed;
//   }
// });

// // Initialize SMS reading with permissions
// export const initSMSReading = async () => {
//   try {
//     // Request permissions
//     const { status } = await Permissions.askAsync(Permissions.SMS);
    
//     if (status !== 'granted') {
//       console.log('SMS permission denied');
//       return false;
//     }
    
//     // Register background fetch
//     await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
//       minimumInterval: 60 * 15, // 15 minutes
//       stopOnTerminate: false,
//       startOnBoot: true,
//     });
    
//     console.log('SMS reading initialized successfully');
//     return true;
//   } catch (error) {
//     console.error('Error initializing SMS reading:', error);
//     return false;
//   }
// };

// // Fetch SMS transactions manually (for immediate reading)
// export const fetchSMSTransactions = () => {
//   return new Promise((resolve, reject) => {
//     const filter = {
//       minDate: Date.now() - 7 * 24 * 60 * 60 * 1000, // Last 7 days
//       maxDate: Date.now(),
//       bodyRegex: '.*(' + SMS_FILTER_BANKS.join('|') + ').*',
//       box: 'inbox'
//     };
    
//     SmsAndroid.list(
//       JSON.stringify(filter),
//       (fail) => {
//         console.log('Failed to retrieve SMS messages:', fail);
//         reject(fail);
//       },
//       (count, smsList) => {
//         if (count === 0) {
//           resolve([]);
//           return;
//         }
        
//         const messages = JSON.parse(smsList);
//         const bankMessages = messages.filter(message => 
//           BANK_SENDERS.some(sender => message.address && message.address.includes(sender)) ||
//           SMS_FILTER_BANKS.some(keyword => 
//             message.body && message.body.toLowerCase().includes(keyword)
//           )
//         );
        
//         const transactions = parseTransactions(bankMessages);
//         resolve(transactions);
//       }
//     );
//   });
// };

// // Parse transactions from SMS messages
// const parseTransactions = (messages) => {
//   return messages.map(message => {
//     const transaction = {
//       originalMessage: message.body,
//       _id: message._id, // Store the SMS ID for deduplication
//       sender: message.address,
//       date: new Date(parseInt(message.date)),
//       parsed: false,
//     };
    
//     // Extract amount - looking for patterns like "Rs. 1,234.56" or "INR 1234.56" or "USD 123"
//     const amountRegex = /(?:Rs\.?|INR|USD)\s*([0-9,]+(\.[0-9]{2})?)/i;
//     const amountMatch = message.body.match(amountRegex);
    
//     if (amountMatch) {
//       transaction.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
//       transaction.parsed = true;
//     }
    
//     // Extract merchant/vendor name - common patterns in bank SMS
//     // This is trickier and depends on bank SMS format
//     const merchantRegex = /(?:at|to|from)\s+([A-Za-z0-9\s&.]+?)(?:\s+on|\s+for|\s+via|\.)/i;
//     const merchantMatch = message.body.match(merchantRegex);
    
//     if (merchantMatch) {
//       transaction.merchant = merchantMatch[1].trim();
//     }
    
//     // Try to determine transaction type (credit/debit)
//     if (
//       message.body.toLowerCase().includes('debited') ||
//       message.body.toLowerCase().includes('spent') ||
//       message.body.toLowerCase().includes('paid') ||
//       message.body.toLowerCase().includes('withdrawal')
//     ) {
//       transaction.type = 'expense';
//     } else if (
//       message.body.toLowerCase().includes('credited') ||
//       message.body.toLowerCase().includes('received') ||
//       message.body.toLowerCase().includes('deposited')
//     ) {
//       transaction.type = 'income';
//     } else {
//       // Default to expense if unclear
//       transaction.type = 'expense';
//     }
    
//     // Attempt to categorize based on merchant keywords
//     transaction.category = categorizeMerchant(transaction.merchant || '');
    
//     return transaction;
//   }).filter(t => t.parsed);
// };

// // Categorize merchants based on keywords
// const categorizeMerchant = (merchant) => {
//   const lowerMerchant = merchant.toLowerCase();
  
//   // These categories can be expanded based on your app's categories
//   if (
//     lowerMerchant.includes('restaurant') || 
//     lowerMerchant.includes('cafe') || 
//     lowerMerchant.includes('food') ||
//     lowerMerchant.includes('swiggy') ||
//     lowerMerchant.includes('zomato')
//   ) {
//     return 'Food & Dining';
//   }
  
//   if (
//     lowerMerchant.includes('uber') || 
//     lowerMerchant.includes('ola') || 
//     lowerMerchant.includes('metro') ||
//     lowerMerchant.includes('transport')
//   ) {
//     return 'Transportation';
//   }
  
//   if (
//     lowerMerchant.includes('mart') || 
//     lowerMerchant.includes('market') || 
//     lowerMerchant.includes('shop') ||
//     lowerMerchant.includes('store') ||
//     lowerMerchant.includes('super')
//   ) {
//     return 'Groceries';
//   }
  
//   if (
//     lowerMerchant.includes('amazon') || 
//     lowerMerchant.includes('flipkart') || 
//     lowerMerchant.includes('myntra')
//   ) {
//     return 'Shopping';
//   }
  
//   // Default category
//   return 'Miscellaneous';
// };

// // Store transactions in your app's storage system
// const storeTransactions = async (transactions) => {
//   try {
//     // Import storage service
//     const { 
//       saveMultipleTransactions, 
//       updateLastSMSCheckTimestamp,
//       storeProcessedMessageIds 
//     } = require('./TransactionStorageService');
    
//     // Store the transactions
//     await saveMultipleTransactions(transactions);
    
//     // Update the timestamp of the last check
//     await updateLastSMSCheckTimestamp();
    
//     // Store the message IDs to avoid duplicates
//     const messageIds = transactions.map(t => t._id || Date.now().toString());
//     await storeProcessedMessageIds(messageIds);
    
//     console.log('Successfully stored', transactions.length, 'transactions');
//     return true;
//   } catch (error) {
//     console.error('Error storing transactions:', error);
//     return false;
//   }
// };

// // Export a function to manually trigger SMS check
// export const checkForNewTransactions = async () => {
//   try {
//     const transactions = await fetchSMSTransactions();
//     if (transactions.length > 0) {
//       await storeTransactions(transactions);
//       return transactions;
//     }
//     return [];
//   } catch (error) {
//     console.error('Error checking for transactions:', error);
//     return [];
//   }
// };

