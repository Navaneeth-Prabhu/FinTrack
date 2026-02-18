// services/SMSDebugService.ts
// Debug helpers for SMS reading — NO dependency on react-native-get-sms-android.
// Uses the custom SmsModule native module via nativeSmsModule.ts.

import { PermissionsAndroid } from 'react-native';
import { readSmsMessages } from './nativeSmsModule';

export const requestSMSPermission = async (): Promise<boolean> => {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      {
        title: 'SMS Permission',
        message: 'This app needs to read your SMS messages to track expenses.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.error('[SMS] Error requesting permission:', err);
    return false;
  }
};

export const debugReadSMS = async () => {
  console.log('[SMS] Starting debug read...');
  const hasPermission = await requestSMSPermission();
  if (!hasPermission) {
    console.log('[SMS] Permission not granted');
    return [];
  }

  const messages = await readSmsMessages(20, 0);
  console.log(`[SMS] Found ${messages.length} messages`);
  messages.slice(0, 5).forEach((m, i) => {
    console.log(`SMS #${i + 1}: from=${m.address} date=${new Date(m.date).toLocaleString()} body=${m.body}`);
    console.log('---');
  });
  if (messages.length > 5) console.log(`... and ${messages.length - 5} more`);
  return messages;
};

const FINANCIAL_KEYWORDS = ['bank', 'credit', 'debit', 'transaction', 'account', 'spent', 'payment', 'transfer', 'balance'];

export const debugReadFinancialSMS = async () => {
  console.log('[SMS] Looking for financial SMS...');
  const hasPermission = await requestSMSPermission();
  if (!hasPermission) return [];

  const messages = await readSmsMessages(100, 0);
  const financial = messages.filter(m => {
    const lower = m.body?.toLowerCase() ?? '';
    return FINANCIAL_KEYWORDS.some(kw => lower.includes(kw));
  });

  console.log(`[SMS] Found ${financial.length} financial messages`);
  financial.slice(0, 10).forEach((m, i) => {
    console.log(`Financial SMS #${i + 1}: from=${m.address} date=${new Date(m.date).toLocaleString()} body=${m.body}`);
    console.log('---');
  });
  if (financial.length > 10) console.log(`... and ${financial.length - 10} more`);
  return financial;
};