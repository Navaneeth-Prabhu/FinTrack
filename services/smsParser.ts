// services/smsParser.ts
// SMS body parsing utilities — NO dependency on react-native-get-sms-android.
// All SMS reading is done via nativeSmsModule.ts (custom native module).

import { PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readSmsMessages, RawSmsMessage } from './nativeSmsModule';

// ─── Storage keys ─────────────────────────────────────────────────────────────
const PROCESSED_SMS_KEY = 'processed_sms_ids';
const LAST_SMS_SCAN_KEY = 'last_sms_scan_timestamp';

// ─── Permission helpers ───────────────────────────────────────────────────────
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

// ─── Financial keyword filter ─────────────────────────────────────────────────
const FINANCIAL_KEYWORDS = [
    'bank', 'credit', 'debit', 'transaction', 'account', 'spent',
    'payment', 'transfer', 'balance', 'card', 'upi', 'atm', 'paid',
    'credited', 'debited', 'withdrawn', 'deposit', 'purchase',
    'inr', 'rs', 'rupee', '₹', 'refund', 'cashback', 'emi',
];

function isFinancialSms(body: string): boolean {
    const lower = body.toLowerCase();
    return FINANCIAL_KEYWORDS.some(kw => lower.includes(kw));
}

// ─── Debug helper ─────────────────────────────────────────────────────────────
export const debugReadSMS = async (): Promise<RawSmsMessage[]> => {
    const hasPermission = await requestSMSPermission();
    if (!hasPermission) {
        console.log('[SMS] Permission not granted');
        return [];
    }
    const messages = await readSmsMessages(20, 0);
    messages.slice(0, 5).forEach((m, i) => {
        console.log(`SMS #${i + 1}: from=${m.address} date=${new Date(m.date).toLocaleString()} body=${m.body}`);
    });
    return messages;
};

// ─── Read financial SMS ───────────────────────────────────────────────────────
export const readFinancialSMS = async (): Promise<RawSmsMessage[]> => {
    const hasPermission = await requestSMSPermission();
    if (!hasPermission) return [];

    const messages = await readSmsMessages(300, 0);
    const financial = messages.filter(m => m.body && isFinancialSms(m.body));
    console.log(`[SMS] ${messages.length} total → ${financial.length} financial`);

    await AsyncStorage.setItem(LAST_SMS_SCAN_KEY, Date.now().toString());
    return financial;
};

// ─── Transaction extraction ───────────────────────────────────────────────────
export const extractTransactionDetails = (smsBody: string, sender?: string) => {
    if (!smsBody) return null;

    const lowerBody = smsBody.toLowerCase();

    // ── Transaction type ──────────────────────────────────────────────────────
    let transactionType: 'income' | 'expense' | 'transfer' = 'expense';

    if (
        lowerBody.includes('credited') || lowerBody.includes('received') ||
        lowerBody.includes('deposited') || lowerBody.includes('credit') ||
        lowerBody.includes('cr.') || lowerBody.includes('salary') ||
        lowerBody.includes('refund')
    ) {
        transactionType = 'income';
    } else if (
        lowerBody.includes('debited') || lowerBody.includes('spent') ||
        lowerBody.includes('paid') || lowerBody.includes('payment') ||
        lowerBody.includes('debit') || lowerBody.includes('dr.') ||
        lowerBody.includes('purchase') || lowerBody.includes('buying')
    ) {
        transactionType = 'expense';
    } else if (
        lowerBody.includes('transfer') || lowerBody.includes('sent') ||
        lowerBody.includes('transferred') ||
        (lowerBody.includes('to') && (lowerBody.includes('a/c') || lowerBody.includes('account')))
    ) {
        transactionType = 'transfer';
    }

    // Credit card usage is always expense
    if (
        (lowerBody.includes('card') && lowerBody.includes('used')) ||
        lowerBody.includes('thank you for paying') ||
        (lowerBody.includes('payment of ') && lowerBody.includes('to '))
    ) {
        transactionType = 'expense';
    }

    // ── Amount ────────────────────────────────────────────────────────────────
    let amount: number | null = null;
    const amountRegex = /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{2})?)|([0-9,]+(?:\.[0-9]{2})?)\s*(?:rs\.?|inr|₹)/i;
    const amountMatch = smsBody.match(amountRegex);
    if (amountMatch) {
        const amountStr = amountMatch[1] || amountMatch[2];
        if (amountStr) amount = parseFloat(amountStr.replace(/,/g, ''));
    }

    // ── Date ──────────────────────────────────────────────────────────────────
    let dateStr: string | null = null;
    let extractedDate: Date | null = null;

    const datePatterns = [
        /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/,
        /\b(\d{1,2})[ -](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[ -](\d{2,4})\b/i,
        /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[ -](\d{1,2})[ ,]+(\d{4})\b/i,
        /\bon\s+(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/i,
        /\bfor\s+(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/i,
        /\bon\s+(\d{1,2})[ -](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[ -](\d{2,4})\b/i,
    ];

    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    for (const pattern of datePatterns) {
        const match = smsBody.match(pattern);
        if (!match) continue;
        dateStr = match[0];
        try {
            let day: number, month: number, year: number;
            const src = pattern.toString();
            if (src.includes('jan|feb|mar')) {
                if (src.includes('MMM DD')) {
                    month = monthNames.findIndex(m => match[1].toLowerCase().startsWith(m)) + 1;
                    day = parseInt(match[2], 10);
                    year = parseInt(match[3], 10);
                } else {
                    day = parseInt(match[1], 10);
                    month = monthNames.findIndex(m => match[2].toLowerCase().startsWith(m)) + 1;
                    year = parseInt(match[3], 10);
                }
            } else {
                day = parseInt(match[1], 10);
                month = parseInt(match[2], 10);
                year = parseInt(match[3], 10);
                if (year < 100) year += year < 50 ? 2000 : 1900;
            }
            if (day > 0 && day <= 31 && month > 0 && month <= 12 && year > 2000) {
                const candidate = new Date(year, month - 1, day);
                if (candidate <= new Date()) {
                    extractedDate = candidate;
                    break;
                }
            }
        } catch {
            // continue to next pattern
        }
    }

    // ── Merchant ──────────────────────────────────────────────────────────────
    let merchant: string | null = null;

    if (lowerBody.includes('used for') && lowerBody.includes('at')) {
        const m = smsBody.match(/used\s+for\s+(?:rs\.?|inr|₹)[\d,.]+\s+at\s+([A-Za-z0-9\s&.'"-]+?)(?:\s+on|\s+dt|\.|$)/i);
        if (m?.[1]) merchant = m[1].trim();
    } else if (lowerBody.includes('payment of') && lowerBody.includes('to')) {
        const m = smsBody.match(/payment\s+of\s+(?:rs\.?|inr|₹)[\d,.]+\s+to\s+([A-Za-z0-9\s&.'"-]+?)(?:\s+for|\s+on|\.|$)/i);
        if (m?.[1]) merchant = m[1].trim();
    } else if (lowerBody.includes('paying') && lowerBody.includes('towards')) {
        const m = smsBody.match(/paying\s+(?:rs\.?|inr|₹)[\d,.]+\s+towards\s+your\s+([A-Za-z0-9\s&.'"-]+?)(?:\s+bill|\s+on|\.|$)/i);
        if (m?.[1]) merchant = m[1].trim();
    } else if (lowerBody.includes('for purchase at')) {
        const m = smsBody.match(/for\s+purchase\s+at\s+([A-Za-z0-9\s&.'"-]+?)(?:\s+on|\.|$)/i);
        if (m?.[1]) merchant = m[1].trim();
    }

    if (!merchant) {
        const patterns =
            transactionType === 'expense'
                ? [
                    /(?:at|@)\s+([A-Za-z0-9\s&.'"-]+?)(?:\s+on|\s+for|\s+via|\s+dt|\.|$)/i,
                    /(?:purchase\s+(?:at|@)\s+)([A-Za-z0-9\s&.'"-]+?)(?:\s+on|\s+for|\s+via|\s+dt|\.|$)/i,
                    /(?:paid\s+(?:at|to)\s+)([A-Za-z0-9\s&.'"-]+?)(?:\s+on|\s+for|\s+via|\s+dt|\.|$)/i,
                    /(?:payment\s+to\s+)([A-Za-z0-9\s&.'"-]+?)(?:\s+on|\s+for|\s+via|\s+dt|\.|$)/i,
                    /(?:spent\s+at\s+)([A-Za-z0-9\s&.'"-]+?)(?:\s+on|\s+for|\s+via|\s+dt|\.|$)/i,
                ]
                : transactionType === 'income'
                    ? [
                        /(?:from|by)\s+([A-Za-z0-9\s&.'"-]+?)(?:\s+on|\s+for|\s+via|\s+dt|\.|$)/i,
                        /(?:credited\s+(?:by|from)\s+)([A-Za-z0-9\s&.'"-]+?)(?:\s+on|\s+for|\s+via|\s+dt|\.|$)/i,
                    ]
                    : [/(?:to)\s+([A-Za-z0-9\s&.'"-]+?)(?:\s+on|\s+for|\s+via|\s+dt|\.|$)/i];

        for (const p of patterns) {
            const m = smsBody.match(p);
            if (m?.[1] && !m[1].match(/[Xx]+\d{4}|[Xx]{4}\d{4}|account|a\/c/i)) {
                merchant = m[1].trim();
                break;
            }
        }
    }

    if (merchant) {
        merchant = merchant.replace(/[.,;:!?]+$/, '').replace(/\b(on|for|via|ref|dt|dated)\b.*$/, '').trim();
    }

    if (!amount) return null;

    return {
        type: transactionType,
        amount,
        merchant,
        date: extractedDate ? extractedDate.toISOString() : null,
        dateStr,
        rawSMS: smsBody,
        sender,
    };
};

// ─── Combine date from SMS body with time from SMS timestamp ──────────────────
const combineExtractedDateWithSMSTime = (extractedDateISO: string, smsTimestamp: number): Date => {
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
};

// ─── Full pipeline: read + parse ──────────────────────────────────────────────
export const getTransactionsFromSMS = async () => {
    try {
        const messages = await readFinancialSMS();
        const transactions = [];

        for (const message of messages) {
            const details = extractTransactionDetails(message.body, message.address);
            if (!details) continue;

            let transactionDate: string;
            if (details.date && message.date) {
                transactionDate = combineExtractedDateWithSMSTime(details.date, message.date).toISOString();
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
        return transactions;
    } catch (error) {
        console.error('[SMS] Error getting transactions:', error);
        return [];
    }
};