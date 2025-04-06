// Create this file at: src/utils/smsReader.js

import { Platform, NativeModules, PermissionsAndroid } from 'react-native';
import SmsRetriever from 'react-native-sms-retriever';

// Get phone number hash for SMS verification
export const getAppSignature = async () => {
    if (Platform.OS !== 'android') return null;

    try {
        const signature = await SmsRetriever.getAppHash();
        console.log('App Hash for SMS:', signature);
        return signature;
    } catch (error) {
        console.error('Error getting app hash:', error);
        return null;
    }
};

// Listen for new SMS messages
export const startSMSListener = async () => {
    if (Platform.OS !== 'android') return;

    try {
        // Request permission
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_SMS,
            {
                title: "SMS Permission",
                message: "This app needs to read SMS to track expenses",
                buttonPositive: "OK",
                buttonNegative: "Cancel"
            }
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('SMS permission denied');
            return;
        }

        // Start the SMS Retriever
        const started = await SmsRetriever.startSmsRetriever();
        if (!started) {
            console.log('Failed to start SMS retriever');
            return;
        }

        // Add listener with callback function
        const subscription = SmsRetriever.addSmsListener(event => {
            const { message } = event;
            console.log('New SMS received:', message);

            if (message) {
                const transaction = extractTransactionFromSMS(message);
                if (transaction) {
                    console.log('Transaction detected:', transaction);
                    // Save transaction to your store
                    // useTransactionStore.getState().addTransaction(transaction);
                }
            }

            // Clean up listener after message is received
            subscription.remove();
        });

        // Return the subscription so it can be removed later if needed
        return subscription;

    } catch (error) {
        console.error('Error in SMS listener:', error);
    }
};

// Read historical SMS messages
export const readHistoricalSMS = async (limit = 100) => {
    if (Platform.OS !== 'android') return [];

    try {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_SMS
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('SMS permission denied');
            return [];
        }

        // Use our native module
        const messages = await NativeModules.SMSReader.readBankSMS(limit);
        console.log(`Read ${messages.length} historical SMS messages`);

        // Process messages
        // const transactions = messages.map(msg => extractTransactionFromSMS(msg.body))
        //   .filter(transaction => transaction !== null);

        // console.log(`Found ${transactions.length} transactions in SMS history`);
        // return transactions;
    } catch (error) {
        console.error('Error reading SMS history:', error);
        return [];
    }
};

// SMS parsing logic
const extractTransactionFromSMS = (messageBody) => {
    if (!messageBody) return null;

    const expensePattern = /debited.*(?:Rs|INR)\s*([\d,.]+)|spent.*(?:Rs|INR)\s*([\d,.]+)/i;
    const incomePattern = /credited.*(?:Rs|INR)\s*([\d,.]+)/i;

    const expenseMatch = messageBody.match(expensePattern);
    const incomeMatch = messageBody.match(incomePattern);

    if (expenseMatch || incomeMatch) {
        const amountStr = (expenseMatch?.[1] || expenseMatch?.[2] || incomeMatch?.[1])?.replace(/,/g, '');
        const amount = parseFloat(amountStr || '0');

        if (amount > 0) {
            return {
                id: Date.now().toString(),
                amount,
                type: expenseMatch ? 'expense' : 'income',
                date: new Date().toISOString(),
                description: messageBody.substring(0, 50),
                category: 'Uncategorized',
                source: 'SMS'
            };
        }
    }
    return null;
};