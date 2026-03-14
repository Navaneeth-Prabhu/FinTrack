// services/smsParser.ts
// Industry-level SMS transaction parser.
// Architecture mirrors the web email-parser:
//   1. Detect bank from SMS sender code (e.g. "VM-HDFCBK" Ã¢â€ â€™ hdfc)
//   2. Apply bank-specific regex for amount / type / merchant / date
//   3. Fall back to generic INR patterns for unknown senders
//   4. Calculate a per-field confidence score (0Ã¢â‚¬â€œ1)

import { PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readSmsMessages, RawSmsMessage } from './nativeSmsModule';
import { parseSIPAllotment, parseLoanEMI, parseStockBuy } from './smsAlertParser';
import {
    handleSIPAllotmentSMS,
    handleLoanEMISMS,
    handleStockBuySMS,
} from './investmentSmsHandler';

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Storage keys Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const LAST_SMS_SCAN_KEY = 'last_sms_scan_timestamp';

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ SMS body normalisation Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// Some banks (HDFC, SBI) send multiline SMS that span 2-3 lines.
// Collapsing them to a single line ensures regex patterns work reliably.
export const normaliseSMSBody = (body: string): string => {
    return body
        .replace(/\r\n/g, ' ')  // Windows CRLF
        .replace(/\n/g, ' ')    // Unix LF
        .replace(/\r/g, ' ')    // old Mac CR
        .replace(/\s{2,}/g, ' ') // collapse multiple spaces
        .trim();
};

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Promotional / Spam Filter Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
/**
 * JS-level spam/promo guard Ã¢â‚¬â€ the last line of defence before extracting a transaction.
 * This mirrors the CRED/Axio approach: positive transaction signals MUST be present,
 * and known promo phrases MUST be absent.
 *
 * Returns true if the SMS should be REJECTED (is spam/promo/alert, not a real transaction).
 */
export function isSpamOrPromoSMS(body: string, sender?: string): boolean {
    const lower = body.toLowerCase();

    // Positive transaction signals. We intentionally combine keyword checks with
    // structural checks to avoid dropping valid bank formats.
    const TRANSACTION_SIGNALS = [
        'debited', 'credited', 'withdrawn', 'deducted', 'spent', 'used', 'purchased',
        'upi ref', 'upi txn', 'neft ref', 'imps ref', 'utr', 'rrn',
        'txn of', 'transaction of',
        'sent rs', 'sent inr', 'paid rs', 'paid inr', 'received rs', 'received inr',
        'available bal', 'avl bal', 'available balance',
        'a/c *', 'a/c no', 'xxxx', 'xx', 'acct', 'ending with',
        'txn id', 'transaction id', 'ref no:', 'ref:', 'vpa', 'card ending',
        'nach debit', 'emi deducted', 'emi paid',
        'folio', 'nav:', 'units allotted',
    ];

    const hasKeywordSignal = TRANSACTION_SIGNALS.some(s => lower.includes(s));
    const hasAmount = /(?:rs\.?|inr|Ã¢â€šÂ¹)\s*[x*]*\s*[\d,]+(?:\.\d{1,2})?/i.test(body);
    const hasActionVerb = /\b(?:debited|credited|withdrawn|deducted|spent|paid|sent|received|transferred|purchased|used|dr\.?|cr\.?)\b/i.test(body);
    const hasFinancialContext = /\b(?:a\/c|account|acct|card|upi|vpa|utr|rrn|imps|neft|rtgs|ref(?:erence)?(?:\s*no)?|txn(?:\s*id)?)\b/i.test(body);
    const hasStructuredSignal = hasAmount && hasActionVerb && hasFinancialContext;

    // Sender-aware fallback: business/alphanumeric senders with amount + financial context.
    const isAlphanumericSender = !!sender && !/^[+0-9]+$/.test(sender);
    const hasSenderHeuristic = isAlphanumericSender && hasAmount && hasFinancialContext;

    if (!hasKeywordSignal && !hasStructuredSignal && !hasSenderHeuristic) {
        return true;
    }

    const SPAM_PHRASES = [
        'get your approved', 'pre-approved loan', 'pre approved loan',
        'offer valid', 'use code', 'promo code', 'coupon code',
        'click here', 'tap here', 'download app', 'download now',
        'expires today', 'expires soon', 'limited time offer',
        'recharge now', 'recharge with', 'pack expired', 'pack has expired',
        '% data consumed', 'data balance low', 'gb data', 'gb at rs',
        'unlimited calls', 'data/day', 'sms/day',
        'credit limit upto', 'credit limit up to', 'credit card offer',
        'loan limit of rs', 'loan offer',
        // NOTE: 'mandate registration', 'autopay mandate', 'e-mandate' removed —
        //       they appear in valid SIP NACH debit confirmation SMS.
        // NOTE: 'collect request', 'upi collect' removed —
        //       they appear in valid UPI P2P incoming credit SMS.
        // NOTE: 'save rs', 'save flat rs' removed —
        //       they appear in valid cashback / refund credited SMS.
        // NOTE: 'apply now', 'apply for' removed (too broad) —
        //       use specific variants below.
        'apply now for loan', 'apply for personal loan', 'apply for credit card',
        'processing fee waived', 'get upto rs', 'get up to rs',
        'cashback offer', 'win rs', 'earn rs',
        'kyc update required', 'update your kyc', 'link your aadhaar',
        // URL shorteners only appear in promo SMS
        'bit.ly/', 't.ly/', 'fb.fbe', 'i.airtel.in', 'tiny.cc',
    ];

    if (SPAM_PHRASES.some(s => lower.includes(s))) return true;

    return false;
}
export type TxType = 'income' | 'expense' | 'transfer' | 'investment';

export interface ParsedSMS {
    type: TxType;
    subType?: 'sip' | 'emi';
    amount: number;
    merchant: string | null;
    date: string | null;          // ISO string
    dateStr: string | null;       // Human-readable e.g. "21 Feb 2026"
    rawSMS: string;
    sender: string | undefined;
    bank: string | null;          // e.g. "HDFC Bank" | null
    accountLast4: string | null;  // e.g. "1234" | null
    paymentMethod: string | null; // "UPI" | "Card" | "NEFT" | etc.
    paidBy?: string | null;       // The VPA or name of who sent you money (for UPI received)
    refNumber: string | null;     // Extracted reference number / Transaction ID
    availableBalance?: number;    // Extracted available balance if present
    units?: number;               // Extracted units for SIPs
    nav?: number;                 // Extracted NAV for SIPs
    confidence: number;           // 0Ã¢â‚¬â€œ1
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Permission helpers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
export const requestSMSPermission = async (): Promise<boolean> => {
    try {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_SMS,
            {
                title: 'SMS Permission',
                message: 'FinTrack needs to read your SMS messages to auto-track expenses.',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'Cancel',
                buttonPositive: 'OK',
            },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
        console.error('[SMS::Parser] Permission error:', err);
        return false;
    }
};

export const checkSMSPermission = async (): Promise<boolean> => {
    try {
        return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
    } catch (err) {
        console.error('[SMS::Parser] Permission check error:', err);
        return false;
    }
};

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Bank sender map Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// Indian bank SMS senders follow patterns like "VM-HDFCBK", "VK-ICICIB", "JD-SBINB"
// The prefix (VM/VK/JD/BP etc.) is the telecom operator code Ã¢â‚¬â€ ignore it.
// We match the suffix after the hyphen.

const BANK_SENDER_MAP: Record<string, string[]> = {
    hdfc: ['HDFCBK', 'HDFCBN', 'HDFCCC', 'HDFCBANKLTD', 'HDFCBANKL'],
    icici: ['ICICIB', 'ICICIC', 'ICICIBNK', 'ICICIBANK'],
    sbi: ['SBINB', 'SBIUPI', 'SBIPSG', 'SBICRD', 'ONLSBI'],
    axis: ['AXISBK', 'AXISBN', 'AXSBNK', 'AXISBANK'],
    kotak: ['KOTAKB', 'KOTKM', 'KOTAKM', 'KOTAKBANK'],
    yes: ['YESBK', 'YESBNK', 'YESBANK'],
    indusind: ['INDBNK', 'IBLBNK', 'INDUSL'],
    idfc: ['IDFCBK', 'IDFCFB', 'IDFCFIRST'],
    federal: ['FEDBK', 'FEDBNK', 'FEDERAL'],
    rbl: ['RBLBNK', 'RBLBK', 'RBLBANK'],
    paytm: ['PYTMBNK', 'PYTMIN', 'PAYTM'],
    phonepe: ['PHNPAY', 'PHONEP', 'PHPEBN'],
    gpay: ['GOOGPAY', 'GPAY', 'OKAXIS', 'OKICICI', 'OKSBI', 'OKHDFCBANK'],
    kgbank: ['KGBANK', 'KGB'],
    // Mutual Fund AMCs and RTAs (for SIP confirmation SMS)
    amc: [
        'SBIMF', 'SBIMFU',
        'HDFCMF', 'HDFMFU',
        'ICICMF', 'ICICIP',
        'AXISMF', 'AXMFND',
        'KAMC', 'KOTMF',
        'NFMFL', 'NIPPON', 'NIPMF',       // Nippon India
        'MIRAE', 'MIRAEF',
        'PPFAS', 'PPFMF',
        'DSPBR', 'DSPMF',
        'UTIMF', 'UTIIND',
        'ABSLMF', 'ABSUND',               // Aditya Birla Sun Life
        'SNDRM', 'SUNDMF',
        'KFINTECH', 'CAMSCO', 'CAMSMF',   // RTAs
        'GROWWS', 'GROWWI',               // Groww platform
        'ZCOINS',                         // Zerodha Coin
    ],
};


// Pretty display names
const BANK_DISPLAY_NAMES: Record<string, string> = {
    hdfc: 'HDFC Bank', icici: 'ICICI Bank', sbi: 'SBI', axis: 'Axis Bank',
    kotak: 'Kotak Mahindra Bank', yes: 'Yes Bank', indusind: 'IndusInd Bank',
    idfc: 'IDFC First Bank', federal: 'Federal Bank', rbl: 'RBL Bank',
    paytm: 'Paytm', phonepe: 'PhonePe', gpay: 'Google Pay',
    kgbank: 'Kerala Gramin Bank',
};

function detectBank(sender: string | undefined): string | null {
    if (!sender) return null;
    // Extract part after last hyphen: "VM-HDFCBK" Ã¢â€ â€™ "HDFCBK"
    const parts = sender.toUpperCase().split('-');
    const code = parts[parts.length - 1];
    for (const [bank, codes] of Object.entries(BANK_SENDER_MAP)) {
        if (codes.some(c => code.includes(c) || c.includes(code))) return bank;
    }
    return null;
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Bank-specific pattern sets Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// Each bank entry has debit[], credit[], merchant[], date[], account[] regex arrays.
// Patterns are ordered by specificity (most specific first).

interface BankPatterns {
    debit: RegExp[];
    credit: RegExp[];
    merchant: RegExp[];
    date: RegExp[];
    account: RegExp[];
}

const BANK_PATTERNS: Record<string, BankPatterns> = {
    hdfc: {
        debit: [
            // Ã¢Å“â€¦ NEW: "Sent Rs.250.00 From HDFC Bank A/C *1088 To MERCHANT On 09/03/26"
            /^Sent\s+(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s+From\s+HDFC/i,
            /Sent\s+(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s+From/i,
            /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*(?:spent|paid|used)\b/i,

            // Existing patterns (keep these)
            /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*(?:has been|is)\s*debited/i,
            /debited[\s\S]*?(?:Rs\.?|INR)\s*([\d,]+\.?\d*)/i,
            /(?:spent|paid|sent)[\s\S]*?(?:Rs\.?|INR)\s*([\d,]+\.?\d*)/i,
            /NACH[\s\S]*?(?:Rs\.?|INR)\s*([\d,]+\.?\d*)/i,
        ],
        credit: [
            /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*(?:has been|is)\s*credited/i,
            /credited.*?(?:Rs\.?|INR)\s*([\d,]+\.?\d*)/i,
            /received.*?(?:Rs\.?|INR)\s*([\d,]+\.?\d*)/i,
        ],
        merchant: [
            // Ã¢Å“â€¦ NEW: "Sent Rs.X From HDFC Bank A/C *XXXX To MERCHANT NAME On DATE"
            /Sent\s+(?:Rs\.?|INR)[\d,.]+\s+From\s+HDFC\s+Bank\s+A\/C\s+\*\d+\s+To\s+(.+?)\s+On\s+/i,

            // Existing patterns (keep these)
            /to\s+VPA\s+[\w.\-]+@[\w.\-]+\s+([A-Z0-9][A-Za-z0-9\s&.'\-]{1,40}?)\s+on\s+/i,
            /by\s+VPA\s+[\w.\-]+@[\w.\-]+\s+([A-Z][A-Z\s]{2,40}?)\s+on\s+/i,
            /to\s+VPA\s+[\w@.\-]+\s+\(([^)]+)\)/i,
            /at\s+([A-Z][A-Z0-9\s\-\.&,']{2,40}?)(?:\s+on|\s+dated|\.|,|$)/i,
            /NACH.*?(?:to|for)\s+([A-Z][A-Za-z0-9\s\-\.&]{2,40}?)(?:\s+on|\s+dated|\.|$)/i,
            /(?:to|by)\s+VPA\s+([\w.\-]+)@/i,
        ],
        date: [
            // Ã¢Å“â€¦ NEW: "On 09/03/26" format used in HDFC UPI SMS
            /\bOn\s+(\d{2}\/\d{2}\/\d{2,4})\b/i,

            // Existing patterns (keep these)
            /on\s+(\d{2}-(?:[A-Za-z]{3}|\d{2})-\d{2,4})/i,
            /dated?\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i,
        ],
        account: [
            // Ã¢Å“â€¦ NEW: "A/C *1088" format
            /A\/C\s+\*(\d{3,4})\b/i,

            // Existing patterns (keep these)
            /(?:a\/c|account|acct)[\s\w]*?(?:ending\s+(?:with\s+)?)?(X+|\*+)(\d{3,4})\b/i,
            /\b[Xx]{3,}(\d{3,4})\b/,
        ],
    },

    icici: {
        debit: [
            /(?:debited|withdrawn).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i,
            /(?:INR|Rs\.?)\s*([\d,]+\.?\d*)\s*(?:debited|withdrawn)/i,
            /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*is debited/i,
        ],
        credit: [
            /(?:INR|Rs\.?)\s*([\d,]+\.?\d*)\s*credited/i,
            /(?:credited|deposited).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i,
        ],
        merchant: [
            /to\s+VPA\s+[\w.\-]+@[\w.\-]+\s+([A-Z][A-Z\s]{2,40}?)\s+on\s+/i,
            /(?:at|to)\s+([A-Z][A-Z0-9\s\-\.&]{2,40}?)(?:\s+on|\s+dated|\.|$)/i,
            /merchant[:\s]+([A-Z][A-Z0-9\s\-\.]{2,40})/i,
            /to\s+VPA\s+([\w.\-]+)@/i,
        ],
        date: [
            /on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i,
            /dated?\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i,
        ],
        account: [
            /(?:a\/c|account|card)[\s\w]*?[xX*]+(\d{4})/i,
        ],
    },

    sbi: {
        debit: [
            /(?:debited|withdrawn|spent).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i,
            /(?:INR|Rs\.?)\s*([\d,]+\.?\d*)\s*(?:debited|withdrawn)/i,
            /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*(?:Dr|Debit)/i,
        ],
        credit: [
            /(?:credited|received|deposited).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i,
            /(?:INR|Rs\.?)\s*([\d,]+\.?\d*)\s*(?:Cr|Credit|credited)/i,
        ],
        merchant: [
            /to\s+VPA\s+[\w.\-]+@[\w.\-]+\s+([A-Z][A-Z\s]{2,40}?)\s+on\s+/i,
            /(?:trf\s+to|paid\s+to|transfer\s+to)\s+([A-Za-z][A-Za-z0-9\s&.\-]{2,40}?)(?:\s+Ref|\s+on|\.|\s*$)/i,
            /(?:at|to)\s+([A-Z][A-Z0-9\s\-\.&]{2,40}?)(?:\s+on|\.|\s*$)/i,
            /to\s+VPA\s+([\w.\-]+)@/i,
        ],
        date: [
            /on\s+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
            /(\d{2}-[A-Za-z]{3}-\d{4})/i,
        ],
        account: [
            /A\/c\s+[xX*]+(\d{3,4})/i,
            /(?:account|a\/c)[\s\w]*?[xX*]+(\d{3,4})/i,
        ],
    },

    axis: {
        debit: [
            /(?:debited|spent).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i,
            /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*(?:debited|spent)/i,
        ],
        credit: [
            /(?:credited|received).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i,
            /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*credited/i,
        ],
        merchant: [
            /to\s+VPA\s+[\w.\-]+@[\w.\-]+\s+([A-Z][A-Z\s]{2,40}?)\s+on\s+/i,
            /(?:at|to)\s+([A-Z][A-Z0-9\s\-\.&]{2,40}?)(?:\s+on|\.|\s*$)/i,
            /for\s+([A-Z][A-Z0-9\s\-\.&]{2,40}?)(?:\s+on|\.|\s*$)/i,
            /to\s+VPA\s+([\w.\-]+)@/i,
        ],
        date: [/on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i],
        account: [/(?:account|card)[\s\w]*?[xX*]+(\d{4})/i],
    },

    kotak: {
        debit: [
            /(?:debited|withdrawn).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i,
            /(?:INR|Rs\.?)\s*([\d,]+\.?\d*)\s*debited/i,
        ],
        credit: [
            /(?:credited|deposited).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i,
        ],
        merchant: [
            /to\s+VPA\s+[\w.\-]+@[\w.\-]+\s+([A-Z][A-Z\s]{2,40}?)\s+on\s+/i,
            /(?:at|to)\s+([A-Z][A-Z0-9\s\-\.&]{2,40}?)(?:\s+on|\.|\s*$)/i,
            /to\s+VPA\s+([\w.\-]+)@/i,
        ],
        date: [/on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i],
        account: [/(?:account|card)[\s\w]*?[xX*]+(\d{4})/i],
    },

    yes: {
        debit: [/(?:debited|withdrawn).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i],
        credit: [/(?:credited|received).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i],
        merchant: [/(?:at|to)\s+([A-Z][A-Z0-9\s\-\.&]{2,40}?)(?:\s+on|\.|\s*$)/i],
        date: [/on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i],
        account: [/(?:account|card)[\s\w]*?[xX*]+(\d{4})/i],
    },

    indusind: {
        debit: [/(?:debited|withdrawn|spent).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i],
        credit: [/(?:credited|received).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i],
        merchant: [/(?:at|to)\s+([A-Z][A-Z0-9\s\-\.&]{2,40}?)(?:\s+on|\.|\s*$)/i],
        date: [/on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i],
        account: [/(?:account|card)[\s\w]*?[xX*]+(\d{4})/i],
    },

    idfc: {
        debit: [/(?:debited|spent).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i],
        credit: [/(?:credited|received).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i],
        merchant: [/(?:at|to)\s+([A-Z][A-Z0-9\s\-\.&]{2,40}?)(?:\s+on|\.|\s*$)/i],
        date: [/on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i],
        account: [/(?:account|card)[\s\w]*?[xX*]+(\d{4})/i],
    },

    federal: {
        debit: [/(?:debited|withdrawn).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i],
        credit: [/(?:credited|received).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i],
        merchant: [/(?:at|to)\s+([A-Z][A-Z0-9\s\-\.&]{2,40}?)(?:\s+on|\.|\s*$)/i],
        date: [/on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i],
        account: [/(?:account|card)[\s\w]*?[xX*]+(\d{4})/i],
    },

    rbl: {
        debit: [/(?:debited|spent).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i],
        credit: [/(?:credited|received).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i],
        merchant: [/(?:at|to)\s+([A-Z][A-Z0-9\s\-\.&]{2,40}?)(?:\s+on|\.|\s*$)/i],
        date: [/on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i],
        account: [/(?:account|card)[\s\w]*?[xX*]+(\d{4})/i],
    },

    paytm: {
        debit: [
            /(?:paid|sent|debited).*?(?:INR|Rs\.?|Ã¢â€šÂ¹)\s*([\d,]+\.?\d*)/i,
            /(?:INR|Rs\.?|Ã¢â€šÂ¹)\s*([\d,]+\.?\d*)\s*(?:paid|sent|debited)/i,
        ],
        credit: [
            /(?:received|added|credited).*?(?:INR|Rs\.?|Ã¢â€šÂ¹)\s*([\d,]+\.?\d*)/i,
        ],
        merchant: [
            /(?:to|from)\s+([A-Z@][A-Za-z0-9\s\-\.@]{2,40}?)(?:\s+on|\s+for|\.|\s*$)/i,
        ],
        date: [
            /on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i,
            /(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})/i,
        ],
        account: [/(?:wallet|bank|account)[\s\w]*?[xX*]+(\d{4})/i],
    },

    phonepe: {
        debit: [
            /(?:paid|sent|debited).*?(?:INR|Rs\.?|Ã¢â€šÂ¹)\s*([\d,]+\.?\d*)/i,
            /(?:INR|Rs\.?|Ã¢â€šÂ¹)\s*([\d,]+\.?\d*)\s*(?:paid|sent)/i,
        ],
        credit: [
            /(?:received|credited).*?(?:INR|Rs\.?|Ã¢â€šÂ¹)\s*([\d,]+\.?\d*)/i,
        ],
        merchant: [
            /(?:to|from)\s+([A-Z@][A-Za-z0-9\s\-\.@]{2,40}?)(?:\s+on|\s+using|\.|\s*$)/i,
            /paid\s+to\s+([A-Za-z0-9\s\-\.]{2,40})/i,
        ],
        date: [
            /on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i,
            /(\d{1,2}\s+[A-Za-z]{3,}\s+\d{4})/i,
        ],
        account: [/(?:bank|account)[\s\w]*?[xX*]+(\d{4})/i],
    },

    gpay: {
        debit: [
            /(?:paid|sent).*?(?:INR|Rs\.?|Ã¢â€šÂ¹)\s*([\d,]+\.?\d*)/i,
            /(?:INR|Rs\.?|Ã¢â€šÂ¹)\s*([\d,]+\.?\d*)\s*(?:paid|sent)/i,
        ],
        credit: [
            /(?:received).*?(?:INR|Rs\.?|Ã¢â€šÂ¹)\s*([\d,]+\.?\d*)/i,
        ],
        merchant: [
            /(?:to|from)\s+([A-Z@][A-Za-z0-9\s\-\.@]{2,40}?)(?:\s+on|\s+using|\.|\s*$)/i,
            /payment\s+to\s+([A-Za-z0-9\s\-\.]{2,40})/i,
        ],
        date: [
            /on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i,
            /(\d{1,2}\s+[A-Za-z]{3,}\s+\d{4})/i,
        ],
        account: [/(?:bank|account)[\s\w]*?[xX*]+(\d{4})/i],
    },
};

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Generic fallback patterns Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const GENERIC_DEBIT_PATTERNS: RegExp[] = [
    /(?:Rs\.?|INR|Ã¢â€šÂ¹)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:has been|is|been)?\s*(?:debited|deducted|withdrawn)/i,
    /(?:debited|deducted|withdrawn|spent|paid)\s+(?:Rs\.?|INR|Ã¢â€šÂ¹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:Rs\.?|INR|Ã¢â€šÂ¹)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:spent|paid|used|purchased|debited|deducted|withdrawn)\b/i,
    /(?:Rs\.?|INR|Ã¢â€šÂ¹)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:Dr\.?|DR)\b/i,
    /amount\s+(?:of\s+)?(?:Rs\.?|INR|Ã¢â€šÂ¹)?\s*([\d,]+(?:\.\d{1,2})?)\s+(?:debited|deducted)/i,
    /(?:Sent)\s*(?:Rs\.?|INR|Ã¢â€šÂ¹)?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:From)/i,
    /(?:sent|transferred)\s+(?:Rs\.?|INR|Ã¢â€šÂ¹)\s*([\d,]+(?:\.\d{1,2})?).*?\bto\b/i,
    /(?:txn|transaction)\s+of\s+(?:Rs\.?|INR|Ã¢â€šÂ¹)\s*([\d,]+(?:\.\d{1,2})?).*?\b(?:at|on|using|via)\b/i,
];

const GENERIC_CREDIT_PATTERNS: RegExp[] = [
    /(?:Rs\.?|INR|Ã¢â€šÂ¹)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:has been|is|been)?\s*credited/i,
    /(?:credited|deposited|received)\s+(?:Rs\.?|INR|Ã¢â€šÂ¹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:Rs\.?|INR|Ã¢â€šÂ¹)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:Cr\.?|CR)\b/i,
    /(?:Rs\.?|INR|Ã¢â€šÂ¹)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:received|credited|deposited)\b/i,
    /(?:salary|refund|cashback)\s+(?:of\s+)?(?:Rs\.?|INR|Ã¢â€šÂ¹)\s*([\d,]+(?:\.\d{1,2})?)\b/i,
];

const GENERIC_AMOUNT_PATTERNS: RegExp[] = [
    /(?:Rs\.?|INR|Ã¢â€šÂ¹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:Rs\.?|INR)/i,
    /amount[:\s]+(?:Rs\.?|INR|Ã¢â€šÂ¹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
];

const GENERIC_REF_PATTERNS: RegExp[] = [
    /(?:UPI Ref No|UPI Ref|Ref No|Ref\.?|UTR|txn id|transaction id)[:\-\s]+([a-zA-Z0-9]{6,20})\b/i,
    /\b(?:RRN|UTR)\s*(?:No\.?|#|:)?\s*([A-Z0-9]{6,30})\b/i,
    /\b(?:UPI|IMPS|NEFT|RTGS)\/([A-Z0-9]{6,30})\b/i,
];

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Financial keyword filter Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const FINANCIAL_KEYWORDS = [
    'bank', 'credit', 'debit', 'transaction', 'account', 'spent',
    'payment', 'transfer', 'balance', 'card', 'upi', 'atm', 'paid',
    'credited', 'debited', 'withdrawn', 'deposit', 'purchase',
    'inr', 'rs', 'rupee', 'Ã¢â€šÂ¹', 'refund', 'cashback', 'emi',
    'neft', 'rtgs', 'imps', 'nach', 'mandate',
];

function isFinancialSms(body: string): boolean {
    const lower = body.toLowerCase();
    return FINANCIAL_KEYWORDS.some(kw => lower.includes(kw));
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Extract amount Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function parseAmountStr(raw: string): number {
    const value = parseFloat(raw.replace(/,/g, ''));
    return isNaN(value) || value <= 0 ? 0 : value;
}

function extractAmount(
    body: string,
    bankKey: string | null,
): { amount: number; type: TxType | null } {
    const combined = body;

    if (bankKey && BANK_PATTERNS[bankKey]) {
        const bp = BANK_PATTERNS[bankKey];

        for (const p of bp.debit) {
            const m = combined.match(p);
            if (m?.[1]) {
                const val = parseAmountStr(m[1]);
                if (val > 0) return { amount: val, type: 'expense' };
            }
        }

        for (const p of bp.credit) {
            const m = combined.match(p);
            if (m?.[1]) {
                const val = parseAmountStr(m[1]);
                if (val > 0) return { amount: val, type: 'income' };
            }
        }
    }

    // Generic debit
    for (const p of GENERIC_DEBIT_PATTERNS) {
        const m = combined.match(p);
        if (m?.[1]) {
            const val = parseAmountStr(m[1]);
            if (val > 0) return { amount: val, type: 'expense' };
        }
    }

    // Generic credit
    for (const p of GENERIC_CREDIT_PATTERNS) {
        const m = combined.match(p);
        if (m?.[1]) {
            const val = parseAmountStr(m[1]);
            if (val > 0) return { amount: val, type: 'income' };
        }
    }

    // Last resort Ã¢â‚¬â€ just find any INR amount
    for (const p of GENERIC_AMOUNT_PATTERNS) {
        const m = combined.match(p);
        if (m?.[1]) {
            const val = parseAmountStr(m[1]);
            if (val > 0) return { amount: val, type: null };
        }
    }

    return { amount: 0, type: null };
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Transaction type refinement Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// Runs AFTER amount extraction to refine type via keyword scoring.
// Uses word-boundary patterns to avoid false positives.

function refineType(body: string, amountType: TxType | null): TxType | null {
    const lower = body.toLowerCase();

    const debitScore = [
        /\bdebited\b/, /\bdebit\b/, /\bdr\.?\b/, /\bspent\b/, /\bpaid\b/,
        /\bpayment\b/, /\bpurchase\b/, /\bcard\s+used\b/, /\bwithdrawn\b/,
        /\bcharged\b/, /\bdeducted\b/, /\bsent\b/, /\bused\b/, /\btxn\b/,
    ].reduce((s, p) => s + (p.test(lower) ? 1 : 0), 0);

    const creditScore = [
        /\bcredited\b/, /\bcredit\b/, /\bcr\.?\b/, /\breceived\b/,
        /\bdeposited\b/, /\bsalary\b/, /\brefund\b/, /\bcashback\b/, /\breversed\b/,
    ].reduce((s, p) => s + (p.test(lower) ? 1 : 0), 0);

    const transferScore = [
        /\btransferred\b/, /\btransfer\b/, /\bneft\b/, /\brtgs\b/, /\bimps\b/, /\bupi\s+ref\b/,
    ].reduce((s, p) => s + (p.test(lower) ? 1 : 0), 0);

    // Transfer: only if this looks like account-to-account movement.
    if (transferScore > 0 && debitScore === 0 && creditScore === 0) {
        const hasAccountToAccountContext =
            /\b(?:from|to)\s+(?:a\/c|account|acct)\b/.test(lower) ||
            /\b(?:imps|neft|rtgs)\b/.test(lower);
        const looksLikeMerchantPayment =
            /\bto\s+[a-z][a-z0-9\s&.'\-]{2,40}\b/.test(lower) &&
            !/\bto\s+(?:a\/c|account|acct)\b/.test(lower);

        if (hasAccountToAccountContext && !looksLikeMerchantPayment) return 'transfer';
        return 'expense';
    }
    if (creditScore > debitScore) return 'income';
    if (debitScore > 0) return 'expense';

    // Industry Standard: If NO financial verbs were found (debit/credit/transfer is 0)
    // AND the original extraction could not classify it (e.g. matched a generic amount without verbs)
    // then we reject it instead of blindly defaulting to 'expense'.
    if (amountType === null && debitScore === 0 && creditScore === 0 && transferScore === 0) {
        return null;
    }

    // Fall back to what amount extraction found, else expense
    return amountType ?? 'expense';
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Payment method detection Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function detectPaymentMethod(body: string): string | null {
    const lower = body.toLowerCase();
    if (
        lower.includes('upi') ||
        lower.includes('vpa') ||
        /@ok(axis|icici|sbi|hdfc|yesbank|paytm|ibl|ybl)/i.test(body) ||
        /\brrn\b/i.test(body)
    ) return 'UPI';
    if (lower.includes('credit card')) return 'Credit Card';
    if (lower.includes('debit card')) return 'Debit Card';
    if (lower.includes('card ending') || lower.includes('card xx') || lower.includes('card x')) return 'Card';
    if (lower.includes('net banking') || lower.includes('netbanking')) return 'Net Banking';
    if (lower.includes('nach') || lower.includes('mandate') || lower.includes('ecs')) return 'NACH';
    if (lower.includes('imps')) return 'IMPS';
    if (lower.includes('neft')) return 'NEFT';
    if (lower.includes('rtgs')) return 'RTGS';
    if (lower.includes('wallet') || lower.includes('paytm') || lower.includes('phonepe')) return 'Wallet';
    if (lower.includes('atm') || lower.includes('cash')) return 'ATM/Cash';
    return null;
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Account extraction Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function extractAccount(body: string, bankKey: string | null): string | null {
    if (bankKey && BANK_PATTERNS[bankKey]) {
        for (const p of BANK_PATTERNS[bankKey].account) {
            const m = body.match(p);
            if (m) {
                const digits = m.slice(1).reverse().find(g => g && /^\d+$/.test(g));
                if (digits) return digits;
            }
        }
    }
    const genericPatterns = [
        /(?:[Xx*]{1,}|a\/c\s*(?:no\.?\s*)?[Xx*]+|a\/c\s*\*+)\s*([0-9]{3,6})\b/i,
        /\b(?:xx|x{2,}|\*{2,})(\d{3,6})\b/i,
        /\b(?:ending|ending with|ending in)\s*(\d{3,6})\b/i,
        /(?:a\/c|account|card)[\s\w]*?\*?(\d{3,6})\b/i,
    ];

    for (const p of genericPatterns) {
        const m = body.match(p);
        if (m?.[1]) return m[1];
    }

    return null;
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Merchant extraction Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const NOISE_WORDS = new Set([
    'your', 'account', 'hdfc', 'icici', 'sbi', 'axis', 'kotak', 'bank', 'ltd',
    'nearest', 'branch', 'atm', 'upi', 'ref', 'reference', 'transaction',
    'txn', 'balance', 'avail', 'note', 'customer', 'care',
]);

const MERCHANT_NORMALIZATIONS: Record<string, string> = {
    swiggy: 'Swiggy', zomato: 'Zomato', amazon: 'Amazon', flipkart: 'Flipkart',
    uber: 'Uber', ola: 'Ola', netflix: 'Netflix', spotify: 'Spotify',
    bigbasket: 'BigBasket', blinkit: 'Blinkit', zepto: 'Zepto',
    phonepe: 'PhonePe', paytm: 'Paytm', gpay: 'Google Pay',
    jio: 'Jio', airtel: 'Airtel', hotstar: 'Disney+ Hotstar',
    irctc: 'IRCTC', rapido: 'Rapido', dunzo: 'Dunzo',
    'ajio': 'AJIO', myntra: 'Myntra', nykaa: 'Nykaa',
};

function normalizeMerchant(raw: string): string {
    const cleaned = raw
        .replace(/\b(on|for|via|ref|dt|dated|using|through|towards|info)[:\s].*/i, '')
        .replace(/[.,;:!?\-]+$/, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/@[\w.\-]+$/i, '') // strip VPA handle "@oksbi"
        .trim();

    const lower = cleaned.toLowerCase();
    for (const [key, display] of Object.entries(MERCHANT_NORMALIZATIONS)) {
        if (lower.includes(key)) return display;
    }

    // Title-case if all-caps (common in bank SMS)
    if (cleaned === cleaned.toUpperCase() && cleaned.length > 1) {
        return cleaned
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    return cleaned;
}

function isBadMerchant(text: string): boolean {
    const lower = text.toLowerCase().trim();
    return (
        text.length < 2 ||
        /[Xx*]{3,}/.test(text) ||
        /^\d{4,}$/.test(text) ||
        /^\d{1,2}:\d{2}/.test(text) ||
        NOISE_WORDS.has(lower) ||
        /^(available|balance|total|amount|avail)\b/i.test(text)
    );
}

function extractMerchant(body: string, bankKey: string | null, type: TxType): string | null {
    const tryPatterns = (patterns: RegExp[]): string | null => {
        for (const p of patterns) {
            const m = body.match(p);
            const candidate = m?.[1]?.trim();
            if (candidate) {
                const normalized = normalizeMerchant(candidate);
                if (!isBadMerchant(normalized)) return normalized;
            }
        }
        return null;
    };

    // Bank-specific patterns first
    if (bankKey && BANK_PATTERNS[bankKey]) {
        const result = tryPatterns(BANK_PATTERNS[bankKey].merchant);
        if (result) return result;
    }

    // Generic fallback patterns based on type
    const genericPatterns: RegExp[] = [
        /(?:sent|transferred)\s+[Ã¢â€šÂ¹Rs.INR\d,.]+(?:[\s\S]*?)\sto\s+([A-Za-z0-9][A-Za-z0-9\s&.'\-]{1,40}?)(?:\s+on|\s+for|\s+via|\.|\s*$)/i,
        /purchase\s+at\s+([A-Za-z0-9][A-Za-z0-9\s&.'\-]{1,40}?)(?:\s+on|\.|$)/i,
        /spent\s+at\s+([A-Za-z0-9][A-Za-z0-9\s&.'\-]{1,40}?)(?:\s+on|\.|$)/i,
        /(?:spent|used|charged)\s+(?:on\s+)?(?:your\s+)?(?:credit|debit)?\s*card[\s\S]*?\bat\s+([A-Za-z0-9][A-Za-z0-9\s&.'\-]{1,40}?)(?:\s+on|\.|$)/i,
        /(?:txn|transaction)\s+of\s+[Ã¢â€šÂ¹Rs.INR\d,.]+[\s\S]*?\bat\s+([A-Za-z0-9][A-Za-z0-9\s&.'\-]{1,40}?)(?:\s+on|\.|$)/i,
        /paid\s+(?:to|at)\s+([A-Za-z0-9][A-Za-z0-9\s&.'\-]{1,40}?)(?:\s+on|\s+for|\.|$)/i,
        /payment\s+(?:of\s+[Ã¢â€šÂ¹Rs.INR\d,.]+\s+)?to\s+([A-Za-z0-9][A-Za-z0-9\s&.'\-]{1,40}?)(?:\s+on|\s+for|\.|$)/i,
        /for\s+([A-Za-z0-9][A-Za-z0-9\s&.'\-]{1,40}?)(?:\s+on|\.|$)/i,
        /towards\s+([A-Za-z0-9][A-Za-z0-9\s&.'\-]{1,40}?)\s+(?:bill|emi|loan|due)/i,
        /credited\s+by\s+([A-Za-z0-9][A-Za-z0-9\s&.'\-]{1,40}?)(?:\s+on|\s+via|\.|\s*$)/i,
        /received\s+from\s+([A-Za-z0-9][A-Za-z0-9\s&.'\-]{1,40}?)(?:\s+on|\s+via|\.|\s*$)/i,
        // Generic from ... to Merchant ... on ... pattern without specific banks
        /from\s+[\w\s*\/]+\s+to\s+([A-Z0-9][A-Za-z0-9\s&.'\-]{2,40}?)(?:\s+on|\s+ref|\.|$)/i,
        // HDFC / strict "To MERCHANT" pattern
        /To\s+([A-Z0-9][A-Za-z0-9\s&.'\-]{2,40}?)(?:\s+On|\.|$)/i,
        // "at XYZ" (not followed by a time)
        /\bat\s+(?!\d{1,2}:\d{2})([A-Za-z][A-Za-z0-9\s&.'\-]{1,40}?)(?:\s+on|\s+for|\s+via|\s+dt|\.|\s*$)/i,
    ];

    return tryPatterns(genericPatterns);
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Extract Payer VPA (For Income / Credit) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function extractPayerVPA(body: string): { paidBy: string | null; merchant: string | null } {
    const tryPatterns = (patterns: RegExp[]): string | null => {
        for (const p of patterns) {
            const m = body.match(p);
            if (m?.[1]) return m[1].trim();
        }
        return null;
    };

    const payerPatterns: RegExp[] = [
        /from\s+([\w.\-]+@[\w.\-]+)/i,             // "from amitverma@okhdfcbank"
        /(?:credited|received).*?from\s+([\w.\-]+@[\w.\-]+)/i,
        /from\s+([A-Za-z0-9][A-Za-z0-9\s&.'\-]{1,40}?)(?:\s+via|\s+on|\s+a\/c|\s+bank|\.|\s*$)/i,
        /(?:credited|received).*?by\s+([A-Za-z0-9][A-Za-z0-9\s&.'\-]{1,40}?)(?:\s+via|\s+on|\s+a\/c|\s+bank|\.|\s*$)/i,
    ];

    const paidBy = tryPatterns(payerPatterns);

    if (!paidBy) return { paidBy: null, merchant: null };

    // Derive a friendly display name from the VPA if it contains an '@'
    let merchantName = paidBy;
    if (paidBy.includes('@')) {
        const vpaPrefix = paidBy.split('@')[0];
        // If the prefix is just numbers (e.g., 9876543210), keep it as is
        if (/^\d+$/.test(vpaPrefix)) {
            merchantName = vpaPrefix;
        } else {
            // "amit.verma" -> "Amit Verma"
            merchantName = vpaPrefix
                .replace(/[.\-_]/g, ' ')
                .replace(/\b(\w)/g, c => c.toUpperCase());
        }
    } else {
        merchantName = normalizeMerchant(paidBy);
    }

    return { paidBy, merchant: merchantName };
}

// ─── Date extraction ────────────────────────────────────────────────────────
const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function monthIndex(name: string): number {
    return MONTH_NAMES.findIndex(m => name.toLowerCase().startsWith(m));
}

function tryParseDate(d: number, m: number, y: number): Date | null {
    const now = new Date();
    // Pivot year: y < 50 => 2000+y, else 1900+y. So 26 -> 2026.
    const year = y < 100 ? (y < 50 ? 2000 + y : 1900 + y) : y;
    if (d < 1 || d > 31 || m < 1 || m > 12 || year < 2000) return null;
    
    // Create candidate at midnight local time
    const candidate = new Date(year, m - 1, d);
    
    // 10-minute future buffer (600,000 ms) for clock drift 
    const nowWithBuffer = new Date(Date.now() + 600000); 
    
    return candidate.getTime() <= nowWithBuffer.getTime() ? candidate : null;
}

function extractDate(body: string, bankKey: string | null): Date | null {
    const _now = new Date();

    // Try bank-specific date patterns first
    if (bankKey && BANK_PATTERNS[bankKey]) {
        for (const p of BANK_PATTERNS[bankKey].date) {
            const m = body.match(p);
            if (m?.[1]) {
                const d = parseRawDateStr(m[1]);
                if (d) return d;
            }
        }
    }

    // Generic date patterns
    const patterns = [
        // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
        /\b(?:on\s+|for\s+)?(?<d>\d{1,2})[\/\-\.](?<m>\d{1,2})[\/\-\.](?<y>\d{2,4})\b/i,
        // DD-MMM-YYYY or DD MMM YYYY
        /\b(?:on\s+)?(?<d>\d{1,2})[\s\-](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-](?<y>\d{2,4})\b/i,
        // MMM DD, YYYY
        /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(?<d>\d{1,2})[,\s]+(?<y>\d{4})\b/i,
    ];

    for (const p of patterns) {
        const m = body.match(p);
        if (!m) continue;
        if (m.groups?.d && m.groups?.y) {
            const day = parseInt(m.groups.d);
            const year = parseInt(m.groups.y);
            let month: number | undefined;

            if (m.groups.m) {
                month = parseInt(m.groups.m);
            } else {
                const monthStr = m[1] || m[2];
                if (monthStr) {
                    month = monthIndex(monthStr) + 1;
                }
            }

            if (month) {
                const d = tryParseDate(day, month, year);
                if (d) return d;
            }
        }
    }

    return null;
}

function parseRawDateStr(s: string): Date | null {
    // DD-MMM-YYYY
    let m = s.match(/(\d{1,2})[-\s](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-\s](\d{2,4})/i);
    if (m) return tryParseDate(parseInt(m[1]), monthIndex(m[2]) + 1, parseInt(m[3]));

    // DD-MM-YYYY or DD/MM/YYYY
    m = s.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
    if (m) return tryParseDate(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]));

    return null;
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Extract Ref Number Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function extractRefNumber(body: string): string | null {
    for (const p of GENERIC_REF_PATTERNS) {
        const m = body.match(p);
        if (m && m[1]) {
            return m[1].toUpperCase();
        }
    }
    return null;
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Extract Available Balance Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function extractAvailableBalance(body: string): number | undefined {
    // Patterns for available balance, e.g., "Avl bal:INR 7,239.16", "Available Balance: Rs. 1000", "Bal Rs.123.45"
    const patterns = [
        /(?:avl(?:\.|iable)?\s*bal(?:ance)?|available\s*balance)[\s:;\-]*?(?:inr|rs\.?|Ã¢â€šÂ¹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
        /bal(?:ance)?[\s:;\-]*?(?:inr|rs\.?|Ã¢â€šÂ¹)\s*([\d,]+(?:\.\d{1,2})?)/i
    ];
    for (const p of patterns) {
        const m = body.match(p);
        if (m && m[1]) {
            const val = parseFloat(m[1].replace(/,/g, ''));
            if (!isNaN(val)) return val;
        }
    }
    return undefined;
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Confidence scoring Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function calculateConfidence(fields: {
    amount: number;
    merchant: string | null;
    date: Date | null;
    accountLast4: string | null;
    bankKey: string | null;
}): number {
    let score = 0;
    if (fields.amount > 0) score += 0.35;        // Amount is highest signal
    if (fields.merchant) score += 0.25;           // Merchant name found
    if (fields.date) score += 0.15;              // Date extracted
    if (fields.accountLast4) score += 0.10;      // Account identified
    if (fields.bankKey) score += 0.15;           // Bank detected from sender
    return Math.min(score, 1.0);
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Read financial SMS Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// Passes minDate watermark to the native layer; the native module does the
// isFinancialSms() filtering for us, so we can safely scan a large window.
export const readFinancialSMS = async (minDate = 0, limit = 2500, maxDate = 0): Promise<ReadSmsResult> => {
    let hasPermission = await checkSMSPermission();
    if (!hasPermission) {
        hasPermission = await requestSMSPermission();
    }
    if (!hasPermission) {
        console.log('[SMS::Parser] READ_SMS permission not granted. Skipping SMS sync.');
        return [];
    }

    // Native layer already filters to financial-only messages, so we do NOT
    // re-apply isFinancialSms() here Ã¢â‚¬â€ that would be redundant and wasteful.
    const result = await readSmsMessages(limit, minDate, maxDate);
    console.log(`[SMS::Parser] Received ${result.messages.length} financial SMS from native (scanned=${result.scannedCount}, oldestScannedDate=${result.oldestScannedDate})`);

    await AsyncStorage.setItem(LAST_SMS_SCAN_KEY, Date.now().toString());
    return result;
};

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Debug helper Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
export const debugReadSMS = async (): Promise<RawSmsMessage[]> => {
    const hasPermission = await requestSMSPermission();
    if (!hasPermission) {
        console.log('[SMS::Parser] Permission not granted');
        return [];
    }
    const result = await readSmsMessages(20, 0);
    result.messages.slice(0, 5).forEach((m, i) => {
        console.log(`[SMS::Debug] #${i + 1}: from=${m.address} body=${m.body?.slice(0, 80)}`);
    });
    return result.messages;
};

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Main extraction function Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
export const extractTransactionFromSMS = (
    smsBody: string,
    sender?: string,
): ParsedSMS | null => {
    if (!smsBody?.trim()) return null;

    // Normalise multiline SMS to a single line so all regex patterns work reliably.
    // Multiline HDFC/SBI UPI SMS were silently failing before this.
    const body = normaliseSMSBody(smsBody);

    // Ã¢Å“â€¦ NEW: JS-level spam guard Ã¢â‚¬â€ reject promos/alerts before any further parsing
    if (isSpamOrPromoSMS(body, sender)) {
        console.log(`[SMS::Parser] Ã¢â€ºâ€ Rejected spam/promo SMS from ${sender ?? 'unknown'}: "${body.slice(0, 60)}..."`);
        return null;
    }

    const bankKey = detectBank(sender);
    const bankName = bankKey ? BANK_DISPLAY_NAMES[bankKey] ?? null : null;

    const { amount, type: rawType } = extractAmount(body, bankKey);
    if (!amount) return null;

    const type = refineType(body, rawType);
    if (!type) {
        console.log(`[SMS::Parser] Filtered vague transaction (amount but no intent) from ${sender}`);
        return null;
    }
    let merchant = extractMerchant(body, bankKey, type);
    let paidBy: string | null = null;

    // For income, attempt to extract the P2P sender
    if (type === 'income') {
        const payerInfo = extractPayerVPA(body);
        if (payerInfo.paidBy) {
            paidBy = payerInfo.paidBy;
            merchant = payerInfo.merchant; // Use derived friendly name
        }
    }

    const date = extractDate(body, bankKey);
    const accountLast4 = extractAccount(body, bankKey);
    const paymentMethod = detectPaymentMethod(body);
    const refNumber = extractRefNumber(body);
    const availableBalance = extractAvailableBalance(body);

    // We optionally add the refNumber to confidence calculation if we want, currently skipped.
    const confidence = calculateConfidence({ amount, merchant, date, accountLast4, bankKey });

    const dateStr = date
        ? `${date.getDate()} ${MONTH_NAMES[date.getMonth()].charAt(0).toUpperCase()}${MONTH_NAMES[date.getMonth()].slice(1)} ${date.getFullYear()}`
        : null;

    // Phase 2: Detect SIP / EMI subtypes
    let subType: 'sip' | 'emi' | undefined;
    const lowerBody = body.toLowerCase();
    let units: number | undefined;
    let nav: number | undefined;

    if (lowerBody.includes('sip') || lowerBody.includes('mutual fund') || lowerBody.includes('units allotted') || lowerBody.includes('allotment') || bankKey === 'amc') {
        subType = 'sip';

        // Extract NAV
        const navMatch = body.match(/(?:NAV|Price)[\s:;-]*(?:Rs\.?|INR|Ã¢â€šÂ¹)?\s*([\d,]+(?:\.\d+)?)/i);
        if (navMatch && navMatch[1]) nav = parseFloat(navMatch[1].replace(/,/g, ''));

        // Extract Units
        const unitsMatch = body.match(/(?:Units|Qty)[\s:;-]*([\d,]+(?:\.\d+)?)/i) || body.match(/([\d,]+(?:\.\d+)?)\s*(?:units|qty)/i);
        if (unitsMatch && unitsMatch[1]) units = parseFloat(unitsMatch[1].replace(/,/g, ''));

    } else if (lowerBody.includes('emi') || lowerBody.includes('loan instalment') || lowerBody.includes('equated monthly')) {
        subType = 'emi';
    }

    console.log(
        `[SMS::Parser] bank=${bankKey ?? 'unknown'} type=${type} subType=${subType ?? 'none'} amount=${amount} merchant="${merchant}" confidence=${confidence.toFixed(2)}`
    );

    return {
        type,
        subType,
        amount,
        merchant,
        date: date?.toISOString() ?? null,
        dateStr,
        rawSMS: smsBody, // keep original for audit trail
        sender,
        bank: bankName,
        accountLast4,
        paymentMethod,
        paidBy,
        refNumber,
        availableBalance,
        units,
        nav,
        confidence,
    };
};

// Backwards-compatible alias
export const extractTransactionDetails = extractTransactionFromSMS;

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Combine SMS body date with SMS metadata time Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function combineDateWithTime(iso: string, smsTimestamp: number): Date {
    try {
        const content = new Date(iso);
        const msg = new Date(smsTimestamp);
        if (isNaN(content.getTime()) || isNaN(msg.getTime())) return content;
        return new Date(
            content.getFullYear(), content.getMonth(), content.getDate(),
            msg.getHours(), msg.getMinutes(), msg.getSeconds(),
        );
    } catch {
        return new Date(iso);
    }
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Full pipeline: read SMS Ã¢â€ â€™ parse Ã¢â€ â€™ return structured list Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
export const getTransactionsFromSMS = async (minDate = 0, limit = 300) => {
    try {
        const result = await readFinancialSMS(minDate, limit);
        const transactions: (ParsedSMS & { smsId: string | undefined; date: string })[] = [];

        for (const message of result.messages) {
            const smsId = message._id?.toString();
            const normBody = normaliseSMSBody(message.body);

            // Ã¢â€â‚¬Ã¢â€â‚¬ Investment SMS routing (BEFORE generic transaction parser) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
            const sipAllotment = parseSIPAllotment(normBody);
            if (sipAllotment) {
                try {
                    await handleSIPAllotmentSMS(sipAllotment, smsId);
                    // Ã¢Å“â€¦ CORRECT: mark AFTER successful write
                    if (smsId) await markSMSProcessed(smsId);
                } catch (err) {
                    // SMS stays unprocessed Ã¢â‚¬â€ will retry on next app open
                    console.warn('[SMS::Pipeline] SIP allotment insert failed, will retry:', smsId, err);
                }
                continue;
            }

            const loanEMI = parseLoanEMI(normBody);
            if (loanEMI) {
                try {
                    await handleLoanEMISMS(loanEMI, smsId);
                    if (smsId) await markSMSProcessed(smsId);
                } catch (err) {
                    console.warn('[SMS::Pipeline] Loan EMI insert failed, will retry:', smsId, err);
                }
                continue;
            }

            const stockBuy = parseStockBuy(normBody);
            if (stockBuy) {
                try {
                    await handleStockBuySMS(stockBuy, smsId);
                    if (smsId) await markSMSProcessed(smsId);
                } catch (err) {
                    console.warn('[SMS::Pipeline] Stock buy insert failed, will retry:', smsId, err);
                }
                continue;
            }

            // Ã¢â€â‚¬Ã¢â€â‚¬ Generic transaction parsing Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
            const parsed = extractTransactionFromSMS(normBody, message.address);
            if (!parsed || parsed.amount <= 0) continue;

            // Combine date from SMS body with the time from SMS metadata
            const transactionDate = parsed.date
                ? combineDateWithTime(parsed.date, message.date).toISOString()
                : new Date(message.date).toISOString();

            transactions.push({
                ...parsed,
                smsId,
                date: transactionDate,
            });
            // NOTE: For regular transactions, markSMSProcessed is called by the
            // caller (smsInitService / useSMSObserver) AFTER saveTransaction succeeds.
            // Do NOT mark here Ã¢â‚¬â€ we return the list and let the caller decide.
        }

        return transactions;
    } catch (err) {
        console.error('[SMS::Pipeline] Fatal error in getTransactionsFromSMS:', err);
        return [];
    }
};

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Helper: mark SMS as processed in AsyncStorage Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const PROCESSED_SMS_KEY = 'processed_sms_ids';

async function markSMSProcessed(smsId: string): Promise<void> {
    try {
        const raw = await AsyncStorage.getItem(PROCESSED_SMS_KEY);
        const ids: string[] = raw ? JSON.parse(raw) : [];
        if (!ids.includes(smsId)) {
            ids.push(smsId);
            // Keep only the last 2000 IDs to prevent unbounded storage growth
            const trimmed = ids.slice(-2000);
            await AsyncStorage.setItem(PROCESSED_SMS_KEY, JSON.stringify(trimmed));
        }
    } catch (err) {
        console.warn('[SMS::Pipeline] Failed to mark SMS processed:', smsId, err);
        // Non-fatal Ã¢â‚¬â€ worst case the SMS gets re-processed (idempotent inserts handle this)
    }
}

export async function isSMSProcessed(smsId: string): Promise<boolean> {
    try {
        const raw = await AsyncStorage.getItem(PROCESSED_SMS_KEY);
        if (!raw) return false;
        const ids: string[] = JSON.parse(raw);
        return ids.includes(smsId);
    } catch {
        return false;
    }
}
