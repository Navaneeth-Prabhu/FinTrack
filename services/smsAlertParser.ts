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
// ─────────────────────────────────────────────────────────────────────────────

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
    // RTA services
    'KFINTECH', 'CAMSCO', 'CAMSMF',
    // GROWW (platform SMS)
    'GROWWS', 'GROWWI',
    // Zerodha Coin
    'ZCOINS',
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
    // Handles "05-Mar-2026", "05/03/2026", "5 Mar 2026"
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

// ─── Intent classifiers ───────────────────────────────────────────────────────

// 1. SIP Confirmation
// Keywords: SIP, Mutual Fund, Units Allotted, folio, NAV, ULIP, allotment
const SIP_CONFIRMATION_PATTERNS = [
    /\bSIP\b.*?(?:processed|confirmed|successful|executed|allotted)/i,
    /units?\s+allotted/i,
    /(?:mutual\s+fund|mf)\s+(?:investment|purchase)/i,
    /folio[:\s]+\d+/i,
    /NAV[:\s]+(?:Rs\.?)?\s*[\d,.]+/i,
    /systematic\s+investment/i,
    /(?:SIP|investment)\s+amount.*?(?:Rs\.?|INR|₹)/i,
    /units?\s+credited/i,
];

function classifySIPConfirmation(body: string, sender?: string): SIPConfirmationIntent | null {
    const lower = body.toLowerCase();
    const isAMC = isAMCSender(sender);

    const matched = isAMC || SIP_CONFIRMATION_PATTERNS.some(p => p.test(body));
    if (!matched) return null;

    // Extract amount
    const amount = extractAmountStr(body) || (() => {
        const m = body.match(/(?:SIP Amount|Investment Amount|Amount)[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i);
        return m ? parseAmount(m[1]) : 0;
    })();

    // Extract fund name
    let fundName = 'Mutual Fund SIP';
    const fundMatch = body.match(
        /(?:Scheme[:\s]+|Fund[:\s]+|folio.*?(?:for|in)\s+)([A-Z][A-Za-z0-9\s&\-()]+?)(?:\s*[-–]\s*(?:Direct|Regular|Growth|Dividend)|Plan|Folio|\n|$)/i,
    ) || body.match(/(['"]?)([A-Z][A-Za-z0-9\s&\-()]{5,60}?)\s+(?:SIP|Mutual Fund|Fund)\1/i);
    if (fundMatch) fundName = fundMatch[fundMatch.length - 1]?.trim() || fundName;

    // Extract units
    const unitsMatch = body.match(/(?:Units?|units?\s+allotted)[:\s]*([\d,]+\.?\d+)/i) ||
        body.match(/for\s+([\d,]+\.?\d+)\s+units?/i);
    const units = unitsMatch ? parseAmount(unitsMatch[1]) : undefined;

    // Extract NAV
    const navMatch = body.match(/NAV[:\s]*(?:of\s+)?(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i);
    const nav = navMatch ? parseAmount(navMatch[1]) : undefined;

    // Extract folio
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
// Keywords: EMI debited, loan instalment, equated monthly
const EMI_DEDUCTION_PATTERNS = [
    /EMI\s+(?:of\s+)?(?:Rs\.?|INR|₹)/i,
    /EMI\s+(?:debited|deducted|paid)/i,
    /loan\s+(?:instalment|installment)\s+(?:of|for)/i,
    /equated\s+monthly\s+instalment/i,
    /EMI.*?(?:debited|deducted|auto.*debit)/i,
    /auto.*debit.*EMI/i,
    /(?:Rs\.?|INR|₹).*?EMI\s+(?:debited|credited)/i,
];

function classifyEMIDeduction(body: string): EMIDeductionIntent | null {
    const matched = EMI_DEDUCTION_PATTERNS.some(p => p.test(body));
    if (!matched) return null;

    const emiMatch = body.match(
        /EMI\s+(?:of\s+)?(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i,
    ) || body.match(
        /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s+(?:debited|deducted).*?EMI/i,
    );
    const emiAmount = emiMatch ? parseAmount(emiMatch[1]) : extractAmountStr(body);

    // Try to detect lender from the SMS body
    const lenderMatch = body.match(
        /(?:towards|for|to)\s+([A-Za-z][A-Za-z0-9\s\-&.]{2,40}?)\s+(?:loan|EMI|account|a\/c)/i,
    ) || body.match(/([A-Z]{4,20})\s+(?:Home|Car|Personal|Education)?\s*Loan/i);
    const lenderHint = lenderMatch?.[1]?.trim() ?? 'Loan';

    const loanAcMatch = body.match(/loan\s*(?:a\/c|account|no\.?)[:\s]*[Xx*]*(\d{3,6})/i);

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
// Keywords: balance, avail bal, closing bal
const ACCOUNT_BALANCE_PATTERNS = [
    /avail(?:able)?\s*(?:bal(?:ance)?|limit)/i,
    /(?:closing|opening|current)\s+bal(?:ance)?/i,
    /a\/c\s+balance/i,
    /(?:balance|bal)(?:\s+is|:)\s*(?:Rs\.?|INR|₹)/i,
    /your\s+(?:account\s+)?balance/i,
    /(?:account|a\/c).*?(?:balance|bal).*?(?:Rs\.?|INR|₹)/i,
];

function classifyAccountBalance(body: string): AccountBalanceIntent | null {
    // Must look like a balance notification, not a transaction confirmation
    const matched = ACCOUNT_BALANCE_PATTERNS.some(p => p.test(body));
    if (!matched) return null;

    // Skip if it's primarily an expense/income SMS with a trailing balance line
    const isTransaction = /(?:debited|credited|paid|received|UPI|NEFT|IMPS)\s+(?:Rs\.?|INR|₹)/i.test(body);
    // If it reads like a transaction, pass to transaction pipeline
    if (isTransaction) return null;

    const availMatch = body.match(
        /avail(?:able)?\s*(?:bal(?:ance)?|limit)[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i,
    ) || body.match(
        /(?:balance|bal)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i,
    ) || body.match(
        /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i,
    );
    const balance = availMatch ? parseAmount(availMatch[1]) : 0;
    if (!balance) return null;

    return {
        kind: 'account_balance',
        balance,
        bankName: null, // will be enriched by the caller
        accountLast4: extractAccountLast4(body),
    };
}

// 4. Loan Alert / Due Reminder / Insurance Premium
// Keywords: EMI due, payment due, due date, minimum due, premium due
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

    // Extract due amount
    const amountMatch = body.match(
        /(?:EMI|due|payment|premium)[:\s]+(?:Rs\.?|INR|₹)\s*[Xx*]*\s*([\d,]+\.?\d*)/i,
    ) || body.match(
        /(?:Rs\.?|INR|₹)\s*[Xx*]*\s*([\d,]+\.?\d*).*?(?:due|EMI|premium)/i,
    );
    const dueAmount = amountMatch ? parseAmount(amountMatch[1]) : undefined;

    // Extract due date
    const dateMatch = body.match(
        /(?:due\s+(?:on|by|date)|payment\s+date)[:\s]*(\d{1,2}[\/\-\s][A-Za-z0-9]{2,3}[\/\-\s]\d{2,4})/i,
    ) || body.match(
        /(?:on|by)\s+(\d{1,2}[\/\-][A-Za-z]{3}[\/\-]\d{2,4})/i,
    );
    const dueDate = dateMatch ? parseMonthDayYear(dateMatch[1]) ?? undefined : undefined;

    const lenderMatch = body.match(
        /(?:your|for)\s+([A-Za-z][A-Za-z\s\-&.]{3,40}?)\s+(?:loan|EMI|account|policy)/i,
    ) || body.match(/^([A-Za-z\s]+?)\s+(?:Premium|Policy|Loan)/i);

    // Fallback if it starts with LIC or similar
    let lenderHint = 'Loan/Premium';
    if (lenderMatch?.[1]) {
        lenderHint = lenderMatch[1].trim();
    } else if (body.toLowerCase().includes('lic premium')) {
        lenderHint = 'LIC';
    }

    return {
        kind: 'loan_alert',
        dueAmount,
        dueDate,
        lenderHint,
        bankName: null,
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
 */
export function classifySMSIntent(body: string, sender?: string): SMSIntent {
    if (!body?.trim()) return { kind: 'unknown' };

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
