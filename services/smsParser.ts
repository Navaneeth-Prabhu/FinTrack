// smsParser.ts
import { PermissionsAndroid } from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys for AsyncStorage
const PROCESSED_SMS_KEY = 'processed_sms_ids';
const LAST_SMS_SCAN_KEY = 'last_sms_scan_timestamp';

// Request SMS permission using PermissionsAndroid directly
export const requestSMSPermission = async () => {
    try {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_SMS,
            {
                title: "SMS Permission",
                message: "This app needs to read your SMS messages to track expenses.",
                buttonNeutral: "Ask Me Later",
                buttonNegative: "Cancel",
                buttonPositive: "OK"
            }
        );

        const success = granted === PermissionsAndroid.RESULTS.GRANTED;
        console.log('SMS permission granted:', success);
        return success;
    } catch (err) {
        console.error('Error requesting SMS permission:', err);
        return false;
    }
};

// Simple function to fetch and log SMS messages for debugging
export const debugReadSMS = async () => {
    console.log('Starting SMS debug reading...');

    // Check permission first
    const hasPermission = await requestSMSPermission();
    if (!hasPermission) {
        console.log('SMS permission not granted, cannot read SMS');
        return [];
    }

    // Simple filter to get recent messages
    const filter = {
        box: 'inbox',         // 'inbox' (default), 'sent', 'draft', 'outbox', 'failed', 'queued'
        maxCount: 20,         // Maximum number of SMS to return
        // No other filters for debugging to ensure we get some messages
    };

    return new Promise((resolve, reject) => {
        SmsAndroid.list(
            JSON.stringify(filter),
            (fail) => {
                console.error('Failed to read SMS:', fail);
                reject(fail);
            },
            (count, smsList) => {
                if (count === 0) {
                    console.log('No SMS messages found');
                    resolve([]);
                    return;
                }

                try {
                    const messages = JSON.parse(smsList);

                    console.log(`Found ${count} SMS messages`);

                    // Log message details for debugging (limit to first 5 for clarity)
                    messages.slice(0, 5).forEach((message, index) => {
                        console.log(`SMS #${index + 1}:`);
                        console.log(`- From: ${message.address}`);
                        console.log(`- Date: ${new Date(parseInt(message.date)).toLocaleString()}`);
                        console.log(`- Body: ${message.body}`);
                        console.log('-------------------');
                    });

                    // Just log count of remaining messages if more than 5
                    if (messages.length > 5) {
                        console.log(`... and ${messages.length - 5} more messages`);
                    }

                    resolve(messages);
                } catch (error) {
                    console.error('Error parsing SMS list:', error);
                    reject(error);
                }
            }
        );
    });
};

// Keywords commonly found in financial messages
const FINANCIAL_KEYWORDS = [
    'bank', 'credit', 'debit', 'transaction', 'account', 'spent',
    'payment', 'transfer', 'balance', 'card', 'upi', 'atm', 'paid'
];

// More targeted function that might find bank/financial messages
export const readFinancialSMS = async () => {
    console.log('Looking for financial SMS messages...');

    // Check permission first
    const hasPermission = await requestSMSPermission();
    if (!hasPermission) {
        console.log('SMS permission not granted, cannot read SMS');
        return [];
    }

    // Try to use a simple filter first without bodyRegex
    const filter = {
        box: 'inbox',
        maxCount: 100 // Check more messages to find financial ones
    };

    return new Promise((resolve, reject) => {
        SmsAndroid.list(
            JSON.stringify(filter),
            (fail) => {
                console.error('Failed to read financial SMS:', fail);
                reject(fail);
            },
            async (count, smsList) => {
                if (count === 0) {
                    console.log('No SMS messages found for analysis');
                    resolve([]);
                    return;
                }

                try {
                    const messages = JSON.parse(smsList);
                    console.log(`Found ${messages.length} total SMS messages, filtering for financial content...`);

                    // Filter for financial messages in JavaScript instead of using bodyRegex
                    const financialMessages = messages.filter(msg => {
                        if (!msg.body) return false;

                        const lowerBody = msg.body.toLowerCase();
                        return FINANCIAL_KEYWORDS.some(keyword => lowerBody.includes(keyword));
                    });

                    console.log(`Found ${financialMessages.length} potential financial SMS messages`);

                    // Only show a few for debugging
                    financialMessages.slice(0, 10).forEach((message, index) => {
                        console.log(`Financial SMS #${index + 1}:`);
                        console.log(`- From: ${message.address}`);
                        console.log(`- Date: ${new Date(parseInt(message.date)).toLocaleString()}`);
                        console.log(`- Body: ${message.body}`);
                        console.log('-------------------');
                    });

                    // Store the last scan time
                    await AsyncStorage.setItem(LAST_SMS_SCAN_KEY, Date.now().toString());

                    resolve(financialMessages);
                } catch (error) {
                    console.error('Error processing SMS messages:', error);
                    reject(error);
                }
            }
        );
    });
};

// Simple function to extract transaction details from an SMS
// Updated extractTransactionDetails function for better SMS parsing

export const extractTransactionDetails = (smsBody: string, sender?: string) => {
    if (!smsBody) return null;

    const lowerBody = smsBody.toLowerCase();

    // Determine transaction type based on keywords in SMS
    let transactionType = 'expense'; // Default

    // Check for income-related keywords
    if (
        lowerBody.includes('credited') ||
        lowerBody.includes('received') ||
        lowerBody.includes('deposited') ||
        lowerBody.includes('credit') ||
        lowerBody.includes('cr.') ||
        lowerBody.includes('salary') ||
        lowerBody.includes('refund')
    ) {
        transactionType = 'income';
    }
    // Check for expense-related keywords
    else if (
        lowerBody.includes('debited') ||
        lowerBody.includes('spent') ||
        lowerBody.includes('paid') ||
        lowerBody.includes('payment') ||
        lowerBody.includes('debit') ||
        lowerBody.includes('dr.') ||
        lowerBody.includes('purchase') ||
        lowerBody.includes('buying')
    ) {
        transactionType = 'expense';
    }
    // Check for transfer-related keywords
    else if (
        lowerBody.includes('transfer') ||
        lowerBody.includes('sent') ||
        lowerBody.includes('transferred') ||
        (lowerBody.includes('to') && (lowerBody.includes('a/c') || lowerBody.includes('account')))
    ) {
        transactionType = 'transfer';
    }

    // Override detection for specific message patterns
    // Check if it's a credit card usage message (always expense)
    if (
        (lowerBody.includes('card') && lowerBody.includes('used')) ||
        (lowerBody.includes('thank you for paying')) ||
        (lowerBody.includes('payment of ') && lowerBody.includes('to '))
    ) {
        transactionType = 'expense';
    }

    // Try to extract amount with improved regex
    let amount = null;
    // Handle different amount formats: Rs. 1,234.56, INR 1234.56, 1,234.56 Rs, ₹1,234.56
    const amountRegex = /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{2})?)|([0-9,]+(?:\.[0-9]{2})?)\s*(?:rs\.?|inr|₹)/i;
    const amountMatch = smsBody.match(amountRegex);

    if (amountMatch) {
        // Get the captured group that contains the amount (either group 1 or 2)
        const amountStr = amountMatch[1] || amountMatch[2];
        if (amountStr) {
            amount = parseFloat(amountStr.replace(/,/g, ''));
        }
    }

    // Extract date with better pattern recognition
    let dateStr = null;
    let extractedDate = null;

    // Look for common date formats: DD/MM/YY, DD-MM-YYYY, DD MMM YYYY, etc.
    const datePatterns = [
        // DD/MM/YYYY or DD/MM/YY
        /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/,
        // DD MMM YYYY
        /\b(\d{1,2})[ -](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[ -](\d{2,4})\b/i,
        // MMM DD, YYYY
        /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[ -](\d{1,2})[ ,]+(\d{4})\b/i,
        // on DATE pattern
        /\bon\s+(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/i,
        // for DATE pattern
        /\bfor\s+(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/i,
        // on DATE text format
        /\bon\s+(\d{1,2})[ -](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[ -](\d{2,4})\b/i,
    ];

    for (const pattern of datePatterns) {
        const match = smsBody.match(pattern);
        if (match) {
            // Store the raw matched date string
            dateStr = match[0];

            // Try to parse the date based on the pattern
            try {
                let day, month, year;

                if (pattern.toString().includes('jan|feb|mar')) {
                    // Handle text month format
                    if (pattern.toString().includes('MMM DD')) {
                        // MMM DD, YYYY format
                        const monthName = match[1].toLowerCase();
                        day = parseInt(match[2], 10);
                        year = parseInt(match[3], 10);
                        // Convert month name to number
                        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
                        month = monthNames.findIndex(m => monthName.startsWith(m)) + 1;
                    } else {
                        // DD MMM YYYY format
                        day = parseInt(match[1], 10);
                        const monthName = match[2].toLowerCase();
                        year = parseInt(match[3], 10);
                        // Convert month name to number
                        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
                        month = monthNames.findIndex(m => monthName.startsWith(m)) + 1;
                    }
                } else {
                    // Handle numeric date format
                    day = parseInt(match[1], 10);
                    month = parseInt(match[2], 10);
                    year = parseInt(match[3], 10);

                    // Handle 2-digit year
                    if (year < 100) {
                        year += year < 50 ? 2000 : 1900;
                    }
                }

                // Validate date components
                if (day > 0 && day <= 31 && month > 0 && month <= 12 && year > 2000) {
                    // Create date object - adjust month (0-based in JS)
                    extractedDate = new Date(year, month - 1, day);

                    // Validate the date is not in the future
                    const now = new Date();
                    if (extractedDate > now) {
                        // If date is in future, it might be a mistake - ignore it
                        extractedDate = null;
                    } else {
                        break; // Stop checking other patterns if we found a valid date
                    }
                }
            } catch (error) {
                console.error('Error parsing date:', error);
                extractedDate = null;
            }
        }
    }

    // Try to extract merchant with improved patterns
    let merchant = null;

    // Special case handling for common SMS formats
    // Handle specific bank message formats first
    if (lowerBody.includes('used for') && lowerBody.includes('at')) {
        // Credit card usage format: "Card XX1234 used for Rs.2,499.00 at FLIPKART"
        const ccMatch = smsBody.match(/used\s+for\s+(?:rs\.?|inr|₹)[\d,.]+\s+at\s+([A-Za-z0-9\s&.'"-]+?)(?:\s+on|\s+dt|\.|$)/i);
        if (ccMatch && ccMatch[1]) {
            merchant = ccMatch[1].trim();
        }
    } else if (lowerBody.includes('payment of') && lowerBody.includes('to')) {
        // Payment format: "Payment of Rs.450.00 to ZOMATO"
        const paymentMatch = smsBody.match(/payment\s+of\s+(?:rs\.?|inr|₹)[\d,.]+\s+to\s+([A-Za-z0-9\s&.'"-]+?)(?:\s+for|\s+on|\.|$)/i);
        if (paymentMatch && paymentMatch[1]) {
            merchant = paymentMatch[1].trim();
        }
    } else if (lowerBody.includes('paying') && lowerBody.includes('towards')) {
        // Bill payment format: "Thank you for paying Rs.1,299.00 towards your Airtel Postpaid"
        const billMatch = smsBody.match(/paying\s+(?:rs\.?|inr|₹)[\d,.]+\s+towards\s+your\s+([A-Za-z0-9\s&.'"-]+?)(?:\s+bill|\s+on|\.|$)/i);
        if (billMatch && billMatch[1]) {
            merchant = billMatch[1].trim();
        }
    } else if (lowerBody.includes('for purchase at')) {
        // HDFC specific format: "debited from your account XX1234 for purchase at AMAZON RETAIL"
        const purchaseMatch = smsBody.match(/for\s+purchase\s+at\s+([A-Za-z0-9\s&.'"-]+?)(?:\s+on|\.|$)/i);
        if (purchaseMatch && purchaseMatch[1]) {
            merchant = purchaseMatch[1].trim();
        }
    } else if (transactionType === 'income' && lowerBody.includes('credited') && lowerBody.includes('by')) {
        // Salary/income format: "credited with Rs.45,000.00 on 01-04-2025 by ACME CORP"
        const creditMatch = smsBody.match(/credited\s+(?:with|by|from)\s+(?:rs\.?|inr|₹)[\d,.]+(?:\s+on[\s\d\/\-\.]+)?\s+by\s+([A-Za-z0-9\s&.'"-]+?)(?:\.|$)/i);
        if (!creditMatch) {
            const altCreditMatch = smsBody.match(/by\s+([A-Za-z0-9\s&.'"-]+?)(?:\.|$)/i);
            if (altCreditMatch && altCreditMatch[1]) {
                merchant = altCreditMatch[1].trim();
            }
        } else if (creditMatch && creditMatch[1]) {
            merchant = creditMatch[1].trim();
        }
    }

    // If no merchant detected from special cases, try general patterns
    if (!merchant) {
        if (transactionType === 'expense') {
            // For expenses, look for "at MERCHANT", "to MERCHANT", "for MERCHANT"
            const merchantPatterns = [
                /(?:at|@)\s+([A-Za-z0-9\s&.'"-]+?)(?:\s+on|\s+for|\s+via|\s+dt|\.|$)/i,
                /(?:purchase\s+(?:at|@)\s+)([A-Za-z0-9\s&.'"-]+?)(?:\s+on|\s+for|\s+via|\s+dt|\.|$)/i,
                /(?:paid\s+(?:at|to)\s+)([A-Za-z0-9\s&.'"-]+?)(?:\s+on|\s+for|\s+via|\s+dt|\.|$)/i,
                /(?:payment\s+to\s+)([A-Za-z0-9\s&.'"-]+?)(?:\s+on|\s+for|\s+via|\s+dt|\.|$)/i,
                /(?:spent\s+at\s+)([A-Za-z0-9\s&.'"-]+?)(?:\s+on|\s+for|\s+via|\s+dt|\.|$)/i
            ];

            // Try each pattern
            for (const pattern of merchantPatterns) {
                const match = smsBody.match(pattern);
                if (match && match[1]) {
                    merchant = match[1].trim();

                    // Don't extract card numbers or account numbers as merchants
                    if (merchant.match(/[Xx]+\d{4}|[Xx]{4}\d{4}|account|a\/c/i)) {
                        merchant = null;
                        continue;
                    }

                    break; // Found a valid merchant
                }
            }
        } else if (transactionType === 'income') {
            // For income, look for "from SENDER" or "by SENDER"
            const fromPatterns = [
                /(?:from|by)\s+([A-Za-z0-9\s&.'"-]+?)(?:\s+on|\s+for|\s+via|\s+dt|\.|$)/i,
                /(?:credited\s+(?:by|from)\s+)([A-Za-z0-9\s&.'"-]+?)(?:\s+on|\s+for|\s+via|\s+dt|\.|$)/i
            ];

            for (const pattern of fromPatterns) {
                const match = smsBody.match(pattern);
                if (match && match[1]) {
                    merchant = match[1].trim();

                    // Don't extract card numbers or account numbers as merchants
                    if (merchant.match(/[Xx]+\d{4}|[Xx]{4}\d{4}|account|a\/c/i)) {
                        merchant = null;
                        continue;
                    }

                    break;
                }
            }
        } else if (transactionType === 'transfer') {
            // For transfers, look for "to RECIPIENT" 
            const toMatch = smsBody.match(/(?:to)\s+([A-Za-z0-9\s&.'"-]+?)(?:\s+on|\s+for|\s+via|\s+dt|\.|$)/i);
            if (toMatch && toMatch[1]) {
                merchant = toMatch[1].trim();

                // Don't extract card numbers or account numbers as merchants
                if (merchant.match(/[Xx]+\d{4}|[Xx]{4}\d{4}|account|a\/c/i)) {
                    merchant = null;
                }
            }
        }
    }

    // Clean up merchant if found
    if (merchant) {
        // Remove any trailing punctuation
        merchant = merchant.replace(/[.,;:!?]+$/, '');

        // Remove common phrases that might be erroneously included
        merchant = merchant.replace(/\b(on|for|via|ref|dt|dated)\b.*$/, '').trim();
    }

    // Only return if we found an amount
    if (amount) {
        return {
            type: transactionType,
            amount,
            merchant,
            date: extractedDate ? extractedDate.toISOString() : null,
            dateStr: dateStr,
            rawSMS: smsBody,
            sender: sender
        };
    }

    return null;
};

/**
 * Helper function to combine date from SMS content with time from SMS timestamp
 * This gives us the correct transaction date with a reasonable time
 */
const combineExtractedDateWithSMSTime = (extractedDateISO, smsTimestamp) => {
    try {
        // Create Date objects for both
        const contentDate = new Date(extractedDateISO);
        const messageTime = new Date(parseInt(smsTimestamp));

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
};

// Updated getTransactionsFromSMS function
export const getTransactionsFromSMS = async () => {
    try {
        const messages = await readFinancialSMS();

        const transactions = [];
        for (const message of messages) {
            const details = extractTransactionDetails(message.body, message.address);
            if (details) {
                // IMPROVED: Better date and time handling with priority system
                let transactionDate;

                if (details.date && message.date) {
                    // Best case: Combine date from SMS content with time from SMS timestamp
                    const combined = combineExtractedDateWithSMSTime(details.date, message.date);
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
        return transactions;
    } catch (error) {
        console.error('Error getting transactions from SMS:', error);
        return [];
    }
};