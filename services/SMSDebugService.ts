// SMSDebugService.js
import { PermissionsAndroid } from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';

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
    return;
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

// More targeted function that might find bank/financial messages
export const debugReadFinancialSMS = async () => {
  console.log('Looking for financial SMS messages...');
  
  // Check permission first
  const hasPermission = await requestSMSPermission();
  if (!hasPermission) {
    console.log('SMS permission not granted, cannot read SMS');
    return;
  }
  
  // Keywords commonly found in financial messages
  const financialKeywords = [
    'bank', 'credit', 'debit', 'transaction', 'account', 
    'spent', 'payment', 'transfer', 'balance'
  ];
  
  // Try to use regex in the filter
  const filter = {
    box: 'inbox',
    maxCount: 100, // Check more messages to find financial ones
    bodyRegex: '.*(' + financialKeywords.join('|') + ').*',
  };
  
  return new Promise((resolve, reject) => {
    SmsAndroid.list(
      JSON.stringify(filter),
      (fail) => {
        console.error('Failed to read financial SMS:', fail);
        reject(fail);
      },
      (count, smsList) => {
        if (count === 0) {
          console.log('No financial SMS messages found');
          resolve([]);
          return;
        }
        
        try {
          const messages = JSON.parse(smsList);
          
          console.log(`Found ${count} potential financial SMS messages`);
          
          // Log message details
          messages.forEach((message, index) => {
            // Only log the first 10 for clarity
            if (index < 10) {
              console.log(`Financial SMS #${index + 1}:`);
              console.log(`- From: ${message.address}`);
              console.log(`- Date: ${new Date(parseInt(message.date)).toLocaleString()}`);
              console.log(`- Body: ${message.body}`);
              console.log('-------------------');
            }
          });
          
          // Just log count of remaining messages if more than 10
          if (messages.length > 10) {
            console.log(`... and ${messages.length - 10} more financial messages`);
          }
          
          resolve(messages);
        } catch (error) {
          console.error('Error parsing financial SMS list:', error);
          reject(error);
        }
      }
    );
  });
};