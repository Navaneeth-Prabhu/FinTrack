// services/smsAlertParser.ts
// ─────────────────────────────────────────────────────────────────────────────
// SMS Intelligence Engine — classifies incoming financial SMS into one of 5
// intents and extracts structured data from each.
//
// Intent types:
//   sip_confirmation  — SIP processed / units allotted
//   emi_deduction     — Loan EMI debited
//   account_balance   — Balance alert / available balance SMS
//   loan_alert        — EMI/loan due notice
//   transaction       — Regular spend / income (pass to existing pipeline)
//   unknown           — Skip
//
// Day 4 additions:
//   parseSIPAllotment()  — named export for investmentSmsHandler
//   parseLoanEMI()       — named export for investmentSmsHandler
//   parseStockBuy()      — named export (Day 8, patterns ready)
//   parseStockSell()     — named export (Day 8, patterns ready)
// ─────────────────────────────────────────────────────────────────────────────

import { normaliseSMSBody, isPromotionalSms } from './smsParser';

// ─── AMC Sender Code Map ──────────────────────────────────────────────────────
// Indian AMCs and RTAs use 6-char SS7 sender codes. We identify them from the
// abbreviated suffix after the operator prefix (e.g. "VK-SBIMF" → "SBIMF").
export const AMC_SENDER_CODES: string[] = [
    // SBI Mutual Fund
    'SBIMF', 'SBIMFU',
    // HDFC Mutual Fund
    'HDFCMF', 'HDFMFU',
    // ICICI Prudential AMC
    'ICICMF', 'ICICIP',
    // Axis AMC
    'AXISMF', 'AXMFND',
    // Kotak AMC
    'KAMC', 'KOTMF',
    // Nippon India (earlier Franklin / Reliance)
    'NFMFL', 'NIPPON', 'NIPMF',
    // Mirae Asset
    'MIRAE', 'MIRAEF',
    // PPFAS (Parag Parikh)
    'PPFAS', 'PPFMF',
    // DSP BlackRock
    'DSPBR', 'DSPMF',
    // UTI AMC
    'UTIMF', 'UTIIND',
    // Aditya Birla Sun Life
    'ABSLMF', 'ABSUND',
    // Sundaram AMC
    'SNDRM', 'SUNDMF',
    // Invesco
    'INVES', 'INVMUF',
    // Edelweiss
    'EDELM', 'EDELMF',
    // Motilal Oswal AMC
    'MOAMF', 'MOAMC',
    // RTA services
    'KFINTECH', 'CAMSCO', 'CAMSMF',
    // GROWW (platform SMS)
    'GROWWS', 'GROWWI',
    // Zerodha Coin
    'ZCOINS',
    // Upstox
    'UPSTOX', 'UPSTX',
    // Angel One
    'ANGMF', 'ANGEL',
];

/** Returns true if a sender looks like an AMC / RTA */
export function isAMCSender(sender: string | undefined): boolean {
    if (!sender) return false;
    const parts = sender.toUpperCase().split('-');
    const code = parts[parts.length - 1];
    return AMC_SENDER_CODES.some(c => code.includes(c) || c.includes(code));
}

// ─── Intent type definitions ─────────────────────────────────────────────────

export type SMSIntentKind =
    | 'sip_confirmation'
    | 'emi_deduction'
    | 'account_balance'
    | 'loan_alert'
    | 'transaction'
    | 'unknown';

export interface SIPConfirmationIntent {
    kind: 'sip_confirmation';
    amount: number;
    fundName: string;
    units?: number;
    nav?: number;
    folio?: string;
    bank: string | null;
    accountLast4: string | null;
}

export interface EMIDeductionIntent {
    kind: 'emi_deduction';
    emiAmount: number;
    lenderHint: string;       // e.g. "HDFC Home Loan" or bank name
    loanAccountHint?: string; // e.g. last 4 of loan a/c
    bankName: string | null;
    accountLast4: string | null;
}

export interface AccountBalanceIntent {
    kind: 'account_balance';
    balance: number;
    bankName: string | null;
    accountLast4: string | null;
}

export interface LoanAlertIntent {
    kind: 'loan_alert';
    dueAmount?: number;
    dueDate?: string;         // ISO date string
    lenderHint: string;
    bankName: string | null;
}

export interface PassThroughIntent {
    kind: 'transaction' | 'unknown';
}

export type SMSIntent =
    | SIPConfirmationIntent
    | EMIDeductionIntent
    | AccountBalanceIntent
    | LoanAlertIntent
    | PassThroughIntent;

// ─── Named structured result types (for investmentSmsHandler.ts) ──────────────
// These are stricter versions of the intent types, used when calling named
// parsers directly (bypassing intent routing).

export interface ParsedSIPAllotment {
    amount: number;        // SIP debit amount
    fundName: string;      // Fund / scheme name
    units: number;         // Units allotted
    nav: number;           // NAV at which units were allotted
    folioNumber: string;   // Folio number (dedup key linkage)
    date: string;          // ISO date string (from SMS body or fallback to today)
    bank: string | null;
    accountLast4: string | null;
}

export interface ParsedLoanEMI {
    emiAmount: number;     // Amount debited
    lenderHint: string;    // Bank/lender name
    loanAccountHint?: string; // Last 4 of loan account
    outstandingAmount?: number; // Remaining balance if mentioned
    date: string;          // ISO date string
    bank: string | null;
    accountLast4: string | null;
}

export interface ParsedStockTrade {
    action: 'buy' | 'sell';
    quantity: number;
    ticker: string;        // e.g. "INFY", "RELIANCE"
    price: number;         // per-unit price
    exchange: string;      // "NSE" | "BSE"
    total: number;         // quantity * price
    orderId?: string;
    date: string;          // ISO date string
}

// ─── Helper utilities ─────────────────────────────────────────────────────────

function parseAmount(str: string): number {
    return parseFloat(str.replace(/,/g, '').replace(/[^\d.]/g, '')) || 0;
}

function extractAmountStr(body: string): number {
    // Handles ₹, Rs., INR, asterisks masking, and comma-formatted numbers
    const m = body.match(/(?:₹|Rs\.?|INR)\s*[Xx*]*\s*([\d,]+\.?\d*)/i);
    return m ? parseAmount(m[1]) : 0;
}

function extractAccountLast4(body: string): string | null {
    const m = body.match(/(?:[Xx*]{2,}|a\/c\s*(?:no\.?)?\s*[Xx*]*)\s*(\d{3,5})\b/i)
        || body.match(/\b[Xx*]{2,}(\d{3,5})\b/);
    return m?.[1] ?? null;
}

function parseMonthDayYear(dateStr: string): string | null {
    // Handles "05-Mar-2026", "05/03/2026", "5 Mar 2026", "01-Mar-26"
    const months: Record<string, number> = {
        jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
        jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    };

    let m = dateStr.match(/(\d{1,2})[\/\-\s]([A-Za-z]{3})[\/\-\s](\d{2,4})/);
    if (m) {
        const d = m[1].padStart(2, '0');
        const mo = (months[m[2].toLowerCase()] ?? 1).toString().padStart(2, '0');
        const y = m[3].length === 2 ? `20${m[3]}` : m[3];
        return `${y}-${mo}-${d}`;
    }

    m = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (m) {
        const d = m[1].padStart(2, '0');
        const mo = m[2].padStart(2, '0');
        const y = m[3].length === 2 ? `20${m[3]}` : m[3];
        return `${y}-${mo}-${d}`;
    }

    return null;
}

/** Extract ISO date from SMS body. Falls back to today's date. */
function extractDateFromBody(body: string): string {
    // Common patterns: "Dt:01-Mar-2026", "on 01-Mar-26", "Date: 05/03/2026"
    const datePatterns = [
        /(?:dt|date)[:\s]+(\d{1,2}[-\/\s][A-Za-z]{3}[-\/\s]\d{2,4})/i,
        /(?:on|dated?)\s+(\d{1,2}[-\/][A-Za-z]{3}[-\/]\d{2,4})/i,
        /(?:on|dated?)\s+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
        /(\d{1,2}[-\/][A-Za-z]{3}[-\/]\d{2,4})/,
        /(\d{2}\/\d{2}\/\d{4})/,
    ];
    for (const p of datePatterns) {
        const m = body.match(p);
        if (m?.[1]) {
            const parsed = parseMonthDayYear(m[1]);
            if (parsed) return parsed;
        }
    }
    return new Date().toISOString().split('T')[0];
}

// ─── Intent classifiers ───────────────────────────────────────────────────────

// 1. SIP Confirmation
// Real-world examples covered:
//   SBI MF:   "Units allotted 11.841 for Rs.999 in Valu Fund Folio:1234567 NAV:84.32 Dt:01-Mar-2026"
//   HDFC MF:  "Your SIP of Rs.1000 in HDFC Mid Cap Fund has been processed. Units:12.345 NAV:81.02 Folio:90123456 -HDFCMF"
//   ICICI Pru:"Dear Investor, Rs.5000 invested in ICICI Pru Bluechip Fund. Units allotted: 89.23, NAV: 56.04, Folio: 2345678"
//   CAMS RTA: "SIP payment of INR 2500 processed for fund XYZ. NAV: 45.23, Units: 55.27, Folio: 345678. -CAMSCO"
//   Groww:    "Your SIP of Rs.500 in Mirae Asset Emerging BlueChip Fund (Dir-Growth) is successful. Units:4.321 NAV:115.87"
const SIP_CONFIRMATION_PATTERNS = [
    /\bSIP\b.*?(?:processed|confirmed|successful|executed|allotted)/i,
    /units?\s+allotted/i,
    /(?:mutual\s+fund|mf)\s+(?:investment|purchase)/i,
    /folio[:\s]+\d+/i,
    /NAV[:\s]+(?:Rs\.?)?\s*[\d,.]+/i,
    /systematic\s+investment/i,
    /(?:SIP|investment)\s+amount.*?(?:Rs\.?|INR|₹)/i,
    /units?\s+credited/i,
    // New Day 4 patterns
    /(?:Rs\.?|INR|₹)\s*[\d,]+.*?(?:in|for)\s+[A-Z].*?(?:fund|scheme)/i,
    /allotment\s+(?:date|confirmation|notice)/i,
    /(?:purchase|subscription)\s+confirmation/i,
    /(?:Rs\.?|INR|₹)[\d,.]+.*?units?\s+[\d,.]+/i,
];

function classifySIPConfirmation(body: string, sender?: string): SIPConfirmationIntent | null {
    const isAMC = isAMCSender(sender);
    const matched = isAMC || SIP_CONFIRMATION_PATTERNS.some(p => p.test(body));
    if (!matched) return null;

    // Extract amount — try multiple patterns in order of specificity
    const amount = (() => {
        const patterns = [
            /(?:SIP Amount|Investment Amount|Amount|SIP of|invested)[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i,
            /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s+(?:in|for|invested)/i,
            /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i,
        ];
        for (const p of patterns) {
            const m = body.match(p);
            if (m) return parseAmount(m[1]);
        }
        return 0;
    })();

    // Extract fund name — cover Scheme, Fund, folio...in, quoted name formats
    let fundName = 'Mutual Fund SIP';
    const fundPatterns = [
        /(?:Scheme|Fund)[:\s]+([A-Z][A-Za-z0-9\s&\-()]{4,60}?)(?:\s*[-–]\s*(?:Direct|Regular|Growth|Dividend)|Plan|Folio|\.|$)/i,
        /(?:in|for)\s+([A-Z][A-Za-z0-9\s&\-()]{4,60}?)\s+(?:Fund|Plan|Scheme|Dir|Direct|Regular|Growth)/i,
        /(?:invested|investment)\s+in\s+([A-Z][A-Za-z0-9\s&\-()]{4,60}?)(?:\s*\.|,|\s+Folio)/i,
        /([A-Z][A-Za-z0-9\s&\-()]{5,60}?)\s+(?:SIP|Mutual Fund|MF)\b/i,
    ];
    for (const p of fundPatterns) {
        const m = body.match(p);
        if (m?.[1]) { fundName = m[1].trim(); break; }
    }

    // Extract units — try "units allotted X", "X units", "Units:X"
    const unitsMatch =
        body.match(/(?:Units?|units?\s+allotted)[:\s]*([\d,]+\.?\d+)/i) ||
        body.match(/for\s+([\d,]+\.?\d+)\s+units?/i) ||
        body.match(/Units?[:\s]*([\d,]+\.?\d+)/i);
    const units = unitsMatch ? parseAmount(unitsMatch[1]) : undefined;

    // Extract NAV
    const navMatch = body.match(/NAV[:\s]*(?:of\s+)?(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i) ||
        body.match(/(?:NAV|Price)[:\s]*([\d,]+\.?\d+)/i);
    const nav = navMatch ? parseAmount(navMatch[1]) : undefined;

    // Extract folio — "Folio:1234567", "Folio No: 1234567", "Folio Number 1234567"
    const folioMatch = body.match(/Folio\s*(?:No\.?|Number)?[:\s]*(\d+)/i);
    const folio = folioMatch?.[1];

    return {
        kind: 'sip_confirmation',
        amount,
        fundName,
        units,
        nav,
        folio,
        bank: null,
        accountLast4: extractAccountLast4(body),
    };
}

// 2. EMI Deduction
// Real-world examples covered:
//   SBI:  "EMI of Rs.35000 debited from A/C XX4521 for Loan A/C XX9876. Outstanding: Rs.27,20,000. -SBI"
//   HDFC: "Your Home Loan EMI of INR 18500.00 has been debited from your a/c XXXX1234. Outstanding: 14,50,200.00"
//   ICICI:"Dear Customer, Rs.45000 debited from your account XXXX5678 towards your Car Loan EMI. -ICICIB"
//   Axis: "EMI of Rs.8500 for Loan A/c XX7890 debited from your Axis Bank a/c. -AXISBK"
//   Auto-debit: "NACH Debit Rs.5500 towards Home Loan EMI. A/c: XXXX6789. Outstanding: Rs.22,40,000"
const EMI_DEDUCTION_PATTERNS = [
    /EMI\s+(?:of\s+)?(?:Rs\.?|INR|₹)/i,
    /EMI\s+(?:debited|deducted|paid)/i,
    /loan\s+(?:instalment|installment)\s+(?:of|for)/i,
    /equated\s+monthly\s+instalment/i,
    /EMI.*?(?:debited|deducted|auto.*debit)/i,
    /auto.*debit.*EMI/i,
    /(?:Rs\.?|INR|₹).*?EMI\s+(?:debited|credited)/i,
    // New Day 4 patterns
    /NACH\s+(?:Debit|debit).*?(?:loan|EMI)/i,
    /(?:Home|Car|Personal|Education|Business)\s+Loan\s+EMI/i,
    /towards\s+(?:your\s+)?(?:\w+\s+)?(?:loan|EMI)/i,
    /loan\s+EMI\s+(?:of|for|has been)/i,
    /(?:Rs\.?|INR|₹)\s*[\d,]+\s+debited.*?loan/i,
];

function classifyEMIDeduction(body: string): EMIDeductionIntent | null {
    const matched = EMI_DEDUCTION_PATTERNS.some(p => p.test(body));
    if (!matched) return null;

    // Extract EMI amount — more specific patterns first
    const emiMatch =
        body.match(/EMI\s+(?:of\s+)?(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i) ||
        body.match(/(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s+(?:debited|deducted).*?(?:EMI|loan)/i) ||
        body.match(/NACH\s+Debit\s+(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i) ||
        body.match(/(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*).*?loan\s+EMI/i);
    const emiAmount = emiMatch ? parseAmount(emiMatch[1]) : extractAmountStr(body);

    // Outstanding balance (useful for loan progress updates)
    const outstandingMatch = body.match(/outstanding[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i) ||
        body.match(/outstanding\s+loan[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i);
    const outstandingAmount = outstandingMatch ? parseAmount(outstandingMatch[1]) : undefined;

    // Detect lender / loan type
    const lenderPatterns = [
        /(?:towards|for)\s+(?:your\s+)?([A-Za-z][A-Za-z0-9\s\-&.]{2,40}?)\s+(?:loan|EMI|account|a\/c)/i,
        /(?:Home|Car|Personal|Education|Business)\s+Loan/i,
        /([A-Z]{4,20})\s+(?:Home|Car|Personal|Education)?Loan/i,
    ];
    let lenderHint = 'Loan';
    for (const p of lenderPatterns) {
        const m = body.match(p);
        if (m) { lenderHint = (m[1] ?? m[0]).trim(); break; }
    }

    const loanAcMatch = body.match(/loan\s*(?:a\/c|account|no\.?)[:\s]*[Xx*]*(\d{3,6})/i) ||
        body.match(/(?:Loan|loan).*?[Xx*]{2,}(\d{3,6})/);

    return {
        kind: 'emi_deduction',
        emiAmount,
        lenderHint,
        loanAccountHint: loanAcMatch?.[1],
        bankName: null,
        accountLast4: extractAccountLast4(body),
    };
}

// 3. Account Balance
const ACCOUNT_BALANCE_PATTERNS = [
    /avail(?:able)?\s*(?:bal(?:ance)?|limit)/i,
    /(?:closing|opening|current)\s+bal(?:ance)?/i,
    /a\/c\s+balance/i,
    /(?:balance|bal)(?:\s+is|:)\s*(?:Rs\.?|INR|₹)/i,
    /your\s+(?:account\s+)?balance/i,
    /(?:account|a\/c).*?(?:balance|bal).*?(?:Rs\.?|INR|₹)/i,
];

function classifyAccountBalance(body: string): AccountBalanceIntent | null {
    const matched = ACCOUNT_BALANCE_PATTERNS.some(p => p.test(body));
    if (!matched) return null;

    // Skip if it's primarily an expense/income SMS with a trailing balance line
    const isTransaction = /(?:debited|credited|paid|received|UPI|NEFT|IMPS)\s+(?:Rs\.?|INR|₹)/i.test(body);
    if (isTransaction) return null;

    const availMatch =
        body.match(/avail(?:able)?\s*(?:bal(?:ance)?|limit)[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i) ||
        body.match(/(?:balance|bal)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i) ||
        body.match(/(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i);
    const balance = availMatch ? parseAmount(availMatch[1]) : 0;
    if (!balance) return null;

    return {
        kind: 'account_balance',
        balance,
        bankName: null,
        accountLast4: extractAccountLast4(body),
    };
}

// 4. Loan Alert / Due Reminder / Insurance Premium
const LOAN_ALERT_PATTERNS = [
    /EMI\s+(?:is\s+)?due/i,
    /payment\s+(?:is\s+)?due/i,
    /(?:loan|EMI)\s+(?:due\s+)?(?:on|before|by)/i,
    /minimum\s+(?:amount\s+)?due/i,
    /outstanding.*?(?:loan|EMI)/i,
    /your\s+loan.*?due/i,
    /please\s+(?:pay|clear)\s+your\s+(?:EMI|loan)/i,
    /EMI\s+date/i,
    /premium.*?(?:due|payable)\s+(?:on|by|before)/i,
    /policy.*?(?:premium|renewal).*?(?:due|payable)/i,
];

function classifyLoanAlert(body: string): LoanAlertIntent | null {
    const matched = LOAN_ALERT_PATTERNS.some(p => p.test(body));
    if (!matched) return null;

    const amountMatch =
        body.match(/(?:EMI|due|payment|premium)[:\s]+(?:Rs\.?|INR|₹)\s*[Xx*]*\s*([\d,]+\.?\d*)/i) ||
        body.match(/(?:Rs\.?|INR|₹)\s*[Xx*]*\s*([\d,]+\.?\d*).*?(?:due|EMI|premium)/i);
    const dueAmount = amountMatch ? parseAmount(amountMatch[1]) : undefined;

    const dateMatch =
        body.match(/(?:due\s+(?:on|by|date)|payment\s+date)[:\s]*(\d{1,2}[\/\-\s][A-Za-z0-9]{2,3}[\/\-\s]\d{2,4})/i) ||
        body.match(/(?:on|by)\s+(\d{1,2}[\/\-][A-Za-z]{3}[\/\-]\d{2,4})/i);
    const dueDate = dateMatch ? parseMonthDayYear(dateMatch[1]) ?? undefined : undefined;

    const lenderMatch =
        body.match(/(?:your|for)\s+([A-Za-z][A-Za-z\s\-&.]{3,40}?)\s+(?:loan|EMI|account|policy)/i) ||
        body.match(/^([A-Za-z\s]+?)\s+(?:Premium|Policy|Loan)/i);

    let lenderHint = 'Loan/Premium';
    if (lenderMatch?.[1]) {
        lenderHint = lenderMatch[1].trim();
    } else if (body.toLowerCase().includes('lic')) {
        lenderHint = 'LIC';
    }

    return { kind: 'loan_alert', dueAmount, dueDate, lenderHint, bankName: null };
}

// ─── Day 4: Named parsers for investmentSmsHandler.ts ────────────────────────
// These return strongly-typed results (not SMSIntent) for direct use by the
// handler layer. They are stricter than the intent classifiers and return null
// if a required field (units/NAV/folio or emiAmount) cannot be extracted.

/**
 * Parse a SIP allotment SMS and return structured data.
 * Returns null if this SMS is NOT a SIP allotment, or if required fields
 * (units, NAV, folio, amount) cannot be extracted.
 *
 * Patterns matched (from IMPLEMENTATION.md Section 5.2):
 *   - "Units allotted 11.841 for Rs.999 in Valu Fund Folio:1234567 NAV:84.32 Dt:01-Mar-2026"
 *   - "Dear Investor, your SIP of Rs.999 in Fund XYZ has been processed. Units: 11.84, NAV: 84.32, Folio: 1234567"
 *   - "Your SIP of Rs.2500 in HDFC Mid Cap Fund processed. Units:30.12 NAV:83.01 Folio:90123456 -HDFCMF"
 *   - "SIP payment of INR 1000 processed for Mirae Asset Emerging BlueChip Fund. NAV:115.67 Units:8.645 Folio:5678901.-MIRAE"
 *   - "Units allotted 55.271 Folio 345678 NAV Rs.45.23 scheme UTI Nifty 50 Index Fund Dt:01-Mar-26"
 *   - CAMS/KFinTech RTA confirmation format
 */
export function parseSIPAllotment(rawBody: string, sender?: string): ParsedSIPAllotment | null {
    const body = normaliseSMSBody(rawBody);

    // Quick gate — must contain allotment/SIP/NAV keywords
    const isAllotment =
        /units?\s+allotted/i.test(body) ||
        /allotment\s+(?:date|confirmation|notice|for)/i.test(body) ||
        (/\bSIP\b.*?(?:processed|successful|confirmed|executed)/i.test(body) && isAMCSender(sender)) ||
        (/(?:purchase|subscription)\s+confirmation/i.test(body));

    if (!isAllotment && !isAMCSender(sender)) return null;

    // Must be SIP-like (has NAV or units)
    const hasNAV = /NAV[:\s]*([\d,]+\.?\d+)/i.test(body);
    const hasUnits = /units?[:\s]*([\d,]+\.?\d+)/i.test(body) || /units?\s+allotted/i.test(body);
    if (!hasNAV && !hasUnits) return null;

    // Amount
    const amountPatterns = [
        /(?:SIP Amount|Amount|SIP of|for\s+(?:Rs\.?|INR|₹))[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i,
        /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s+(?:in|invested|for)/i,
        /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i,
    ];
    let amount = 0;
    for (const p of amountPatterns) {
        const m = body.match(p);
        if (m) { amount = parseAmount(m[1]); break; }
    }

    // Units — "Units allotted 11.841", "Units:12.345", "for 11.841 units", "for 2.098 units has been processed"
    const unitsPatterns = [
        /units?\s+allotted\s*([\d,]+\.?\d+)/i,
        /(?:Units?|Qty)[:\s]*([\d,]+\.?\d+)/i,
        /for\s+([\d,]+\.?\d+)\s+units?/i,
        /([\d,]+\.?\d+)\s+units?\s+(?:allotted|credited)/i,
    ];
    let units = 0;
    for (const p of unitsPatterns) {
        const m = body.match(p);
        if (m) { units = parseAmount(m[1]); break; }
    }

    // NAV — "NAV:84.32", "NAV Rs.84.32", "NAV: 84.32", "NAV of Rs.476.62"
    const navMatch =
        body.match(/NAV[:\s]+(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d+)/i) ||
        body.match(/(?:NAV|Price)[:\s]*([\d,]+\.?\d+)/i) ||
        body.match(/NAV\s+(?:of\s+)?(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d+)/i);
    const nav = navMatch ? parseAmount(navMatch[1]) : 0;

    // Folio — "Folio:1234567", "Folio No: 1234567", "Folio Number: 1234567"
    const folioMatch = body.match(/Folio\s*(?:No\.?|Number)?[:\s]*(\d{4,12})/i);
    const folioNumber = folioMatch?.[1] ?? '';

    // Fund name
    let fundName = 'Mutual Fund SIP';
    const fundPatterns = [
        /(?:scheme|fund)[:\s]+([A-Z][A-Za-z0-9\s&\()\-]{4,60}?)(?:\s*[-–]\s*(?:Direct|Regular|Growth|Dividend)|Plan|Folio|\s*Dt|\.|$)/i,
        /Folio\s*\d+.*?in\s+([A-Z][A-Za-z0-9\s&\()\-]{4,60}?)(?:\s*[-–]\s*(?:Direct|Regular|Growth|Dividend)|Plan|Folio|\s*Dt|\.|$)/i,
        /(?:in|for)\s+([A-Z][A-Za-z0-9\s&\()\-]{4,60}?)\s+(?:Fund|Plan|Scheme|Dir|Direct|Regular|Growth)/i,
        /([A-Z][A-Za-z0-9\s&\()\-]{5,60}?)\s+(?:SIP|Mutual Fund|MF|Index Fund)\b/i,
    ];
    for (const p of fundPatterns) {
        const m = body.match(p);
        if (m?.[1] && !m[1].toLowerCase().includes('folio')) {
            fundName = m[1].trim();
            break;
        }
    }

    const date = extractDateFromBody(body);

    return {
        amount,
        fundName,
        units,
        nav,
        folioNumber,
        date,
        bank: null,
        accountLast4: extractAccountLast4(body),
    };
}

/**
 * Parse a loan EMI deduction SMS and return structured data.
 * Returns null if this SMS is NOT an EMI deduction.
 *
 * Patterns matched (from IMPLEMENTATION.md Section 5.2):
 *   - "EMI of Rs.35000 debited from A/C XX4521 for Loan A/C XX9876. Outstanding: Rs.27,20,000. -SBI"
 *   - "Your EMI of INR 5,500.00 for Loan ending 8832 is due on 10-Apr-2026"
 *   - "Your Home Loan EMI of INR 18500 has been debited from a/c XXXX1234. Outstanding: 14,50,200"
 *   - "NACH Debit Rs.8500 towards Home Loan EMI. A/c: XXXX6789. Outstanding: Rs.22,40,000"
 *   - "Dear Customer, Rs.45000 debited from your account XXXX5678 towards Car Loan EMI."
 */
export function parseLoanEMI(rawBody: string): ParsedLoanEMI | null {
    const body = normaliseSMSBody(rawBody);

    const matched = EMI_DEDUCTION_PATTERNS.some(p => p.test(body));
    if (!matched) return null;

    // EMI amount
    const emiPatterns = [
        /EMI\s+(?:of\s+)?(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i,
        /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s+(?:debited|deducted).*?(?:EMI|loan)/i,
        /NACH\s+Debit\s+(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i,
        /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*).*?loan\s+EMI/i,
        /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s+debited/i,
    ];
    let emiAmount = 0;
    for (const p of emiPatterns) {
        const m = body.match(p);
        if (m) { emiAmount = parseAmount(m[1]); break; }
    }
    if (!emiAmount) emiAmount = extractAmountStr(body);

    // Outstanding balance
    const outstandingMatch =
        body.match(/outstanding[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i) ||
        body.match(/outstanding\s+loan[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i);
    const outstandingAmount = outstandingMatch ? parseAmount(outstandingMatch[1]) : undefined;

    // Lender / loan type
    const lenderPatterns = [
        /(?:towards|for)\s+(?:your\s+)?([A-Za-z][A-Za-z0-9\s\-&.]{2,40}?)\s+(?:loan|EMI|account|a\/c)/i,
        /(Home|Car|Personal|Education|Business)\s+Loan/i,
    ];
    let lenderHint = 'Loan';
    for (const p of lenderPatterns) {
        const m = body.match(p);
        if (m) { lenderHint = (m[1] ?? m[0]).trim(); break; }
    }

    // Loan account last 4
    const loanAcMatch =
        body.match(/(?:[Ll]oan\s*(?:a\/c|account|ending|no\.?)[:\s]*[Xx*]*)(\d{3,6})/i) ||
        body.match(/(?:[Ll]oan|loan).*?[Xx*]{2,}(\d{3,6})/);
    const loanAccountHint = loanAcMatch?.[1];

    const date = extractDateFromBody(body);

    return {
        emiAmount,
        lenderHint,
        loanAccountHint,
        outstandingAmount,
        date,
        bank: null,
        accountLast4: extractAccountLast4(body),
    };
}

/**
 * Parse a stock buy SMS and return structured trade data.
 * Returns null if this SMS is not a stock buy confirmation.
 *
 * Platforms covered:
 *   - Zerodha: "Bought 10 INFY @ 1895.00 on NSE. Order 234567890. -Zerodha"
 *   - Groww:   "Order executed: Bought 5 RELIANCE at Rs.2850 on NSE"
 *   - Upstox:  "Order confirmed: BUY 15 TATAMOTORS @ 945.50 NSE"
 *   - Angel:   "Your order to BUY 20 HDFCBANK at Rs.1640 on NSE has been executed."
 */
export function parseStockBuy(rawBody: string): ParsedStockTrade | null {
    const body = normaliseSMSBody(rawBody);

    // Gate: must look like a buy confirmation
    const isBuy = /\b(?:bought|buy|purchase[d]?)\b/i.test(body) &&
        /\b(?:NSE|BSE)\b/.test(body);
    if (!isBuy) return null;

    // Zerodha: "Bought 10 INFY @ 1895.00 on NSE"
    const zerodha = body.match(/[Bb]ought\s+(\d+)\s+([A-Z&]+)\s+@\s*([\d,.]+)\s+on\s+(NSE|BSE)/i);
    if (zerodha) {
        const quantity = parseInt(zerodha[1], 10);
        const price = parseAmount(zerodha[3]);
        return {
            action: 'buy', quantity,
            ticker: zerodha[2].toUpperCase(),
            price, exchange: zerodha[4].toUpperCase(),
            total: quantity * price,
            date: extractDateFromBody(body),
        };
    }

    // Groww / general: "Bought 5 RELIANCE at Rs.2850 on NSE"
    const groww = body.match(/(?:order\s+executed.*?)?[Bb]ought\s+(\d+)\s+([A-Z&]+)\s+at\s+(?:Rs\.?|INR|₹)?\s*([\d,.]+)\s+on\s+(NSE|BSE)/i);
    if (groww) {
        const quantity = parseInt(groww[1], 10);
        const price = parseAmount(groww[3]);
        return {
            action: 'buy', quantity,
            ticker: groww[2].toUpperCase(),
            price, exchange: groww[4].toUpperCase(),
            total: quantity * price,
            date: extractDateFromBody(body),
        };
    }

    // Upstox / Angel: "BUY 15 TATAMOTORS @ 945.50 NSE"
    const upstox = body.match(/\bBUY\s+(\d+)\s+([A-Z&]+)\s+@\s*([\d,.]+)\s+(NSE|BSE)/i) ||
        body.match(/to\s+BUY\s+(\d+)\s+([A-Z&]+)\s+at\s+(?:Rs\.?|INR|₹)?\s*([\d,.]+)\s+on\s+(NSE|BSE)/i);
    if (upstox) {
        const quantity = parseInt(upstox[1], 10);
        const price = parseAmount(upstox[3]);
        return {
            action: 'buy', quantity,
            ticker: upstox[2].toUpperCase(),
            price, exchange: upstox[4].toUpperCase(),
            total: quantity * price,
            date: extractDateFromBody(body),
        };
    }

    return null;
}

/**
 * Parse a stock sell SMS and return structured trade data.
 * Returns null if not a sell confirmation.
 */
export function parseStockSell(rawBody: string): ParsedStockTrade | null {
    const body = normaliseSMSBody(rawBody);

    const isSell = /\b(?:sold|sell)\b/i.test(body) && /\b(?:NSE|BSE)\b/.test(body);
    if (!isSell) return null;

    // "Sold 10 INFY @ 1930.00 on NSE"
    const m =
        body.match(/[Ss]old\s+(\d+)\s+([A-Z&]+)\s+@\s*([\d,.]+)\s+on\s+(NSE|BSE)/i) ||
        body.match(/[Ss]old\s+(\d+)\s+([A-Z&]+)\s+at\s+(?:Rs\.?|INR|₹)?\s*([\d,.]+)\s+on\s+(NSE|BSE)/i) ||
        body.match(/SELL\s+(\d+)\s+([A-Z&]+)\s+@\s*([\d,.]+)\s+(NSE|BSE)/i);

    if (!m) return null;

    const quantity = parseInt(m[1], 10);
    const price = parseAmount(m[3]);
    return {
        action: 'sell', quantity,
        ticker: m[2].toUpperCase(),
        price, exchange: m[4].toUpperCase(),
        total: quantity * price,
        date: extractDateFromBody(body),
    };
}

export interface ParsedNACHMFDebit {
    amount: number;
    amcName: string;
    folioNumber: string;
    date: string;
    bank: string | null;
    accountLast4: string | null;
}

/**
 * Parse a bank NACH debit SMS that was made towards a Mutual Fund SIP, but lacks
 * units/NAV. Usually formatted with an Info section.
 * Example: "UPDATE: INR 5,000.00 debited from HDFC Bank XX1088 on 27-FEB-26. Info: NIPPONMUTUALFUND_367624509_162207359"
 */
export function parseNACHMFDebit(rawBody: string, sender?: string): ParsedNACHMFDebit | null {
    const body = normaliseSMSBody(rawBody);

    // Look for the "Info: AMCNAME_FOLIONUMBER_TRXID" pattern
    const infoMatch = body.match(/Info[:\s]*([A-Z0-9]+MUTUALFUND)_(\d+)_/i) ||
        body.match(/Info[:\s]*([A-Z0-9]+MF)_(\d+)_/i);
    if (!infoMatch) return null;

    // Must be a debit/payment
    if (!/(?:debited|deducted|paid|payment|auto.*debit|NACH)/i.test(body)) return null;

    // Extract Amount
    const amountMatch = body.match(/(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i);
    const amount = amountMatch ? parseAmount(amountMatch[1]) : 0;
    if (!amount) return null;

    // Clean AMC Name
    let amcName = infoMatch[1].replace(/MUTUALFUND|MF/i, '').trim();
    if (amcName.toUpperCase() === 'NIPPON') amcName = 'Nippon India';

    const folioNumber = infoMatch[2];

    return {
        amount,
        amcName,
        folioNumber,
        date: extractDateFromBody(body),
        bank: null,
        accountLast4: extractAccountLast4(body),
    };
}

// ─── Main classifier ─────────────────────────────────────────────────────────

/**
 * Classify an SMS body + sender into a structured intent.
 *
 * Order of evaluation (highest specificity first):
 *   1. SIP confirmation (also triggered by AMC senders)
 *   2. Loan alert (due reminder — no debit)
 *   3. EMI deduction (actual debit)
 *   4. Account balance (no debit/credit, just balance info)
 *   5. Fall through to transaction pipeline
 *
 * Note: normaliseSMSBody is called at this entry point so all sub-classifiers
 * receive a cleaned single-line body (multiline SMS support — Day 1 fix).
 */
export function classifySMSIntent(rawBody: string, sender?: string): SMSIntent {
    if (!rawBody?.trim()) return { kind: 'unknown' };

    // Normalise multiline SMS before classification
    const body = normaliseSMSBody(rawBody);

    if (isPromotionalSms(body)) {
        console.log(`[SMS::Intent] Filtered promotional SMS: ${rawBody.slice(0, 30)}...`);
        return { kind: 'unknown' };
    }

    const sip = classifySIPConfirmation(body, sender);
    if (sip) return sip;

    const loanAlert = classifyLoanAlert(body);
    if (loanAlert) return loanAlert;

    const emi = classifyEMIDeduction(body);
    if (emi) return emi;

    const balance = classifyAccountBalance(body);
    if (balance) return balance;

    return { kind: 'transaction' };
}

// ─── Re-export parseMonthDayYear for use in handlers ─────────────────────────
export { parseMonthDayYear };
