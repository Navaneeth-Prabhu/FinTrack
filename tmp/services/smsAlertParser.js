"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AMC_SENDER_CODES = void 0;
exports.isAMCSender = isAMCSender;
exports.parseSIPAllotment = parseSIPAllotment;
exports.parseLoanEMI = parseLoanEMI;
exports.parseStockBuy = parseStockBuy;
exports.parseStockSell = parseStockSell;
exports.parseNACHMFDebit = parseNACHMFDebit;
exports.classifySMSIntent = classifySMSIntent;
exports.parseMonthDayYear = parseMonthDayYear;
var smsParser_1 = require("./smsParser");
// ─── AMC Sender Code Map ──────────────────────────────────────────────────────
// Indian AMCs and RTAs use 6-char SS7 sender codes. We identify them from the
// abbreviated suffix after the operator prefix (e.g. "VK-SBIMF" → "SBIMF").
exports.AMC_SENDER_CODES = [
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
function isAMCSender(sender) {
    if (!sender)
        return false;
    var parts = sender.toUpperCase().split('-');
    var code = parts[parts.length - 1];
    return exports.AMC_SENDER_CODES.some(function (c) { return code.includes(c) || c.includes(code); });
}
// ─── Helper utilities ─────────────────────────────────────────────────────────
function parseAmount(str) {
    return parseFloat(str.replace(/,/g, '').replace(/[^\d.]/g, '')) || 0;
}
function extractAmountStr(body) {
    // Handles ₹, Rs., INR, asterisks masking, and comma-formatted numbers
    var m = body.match(/(?:₹|Rs\.?|INR)\s*[Xx*]*\s*([\d,]+\.?\d*)/i);
    return m ? parseAmount(m[1]) : 0;
}
function extractAccountLast4(body) {
    var _a;
    var m = body.match(/(?:[Xx*]{2,}|a\/c\s*(?:no\.?)?\s*[Xx*]*)\s*(\d{3,5})\b/i)
        || body.match(/\b[Xx*]{2,}(\d{3,5})\b/);
    return (_a = m === null || m === void 0 ? void 0 : m[1]) !== null && _a !== void 0 ? _a : null;
}
function parseMonthDayYear(dateStr) {
    var _a;
    // Handles "05-Mar-2026", "05/03/2026", "5 Mar 2026", "01-Mar-26"
    var months = {
        jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
        jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    };
    var m = dateStr.match(/(\d{1,2})[\/\-\s]([A-Za-z]{3})[\/\-\s](\d{2,4})/);
    if (m) {
        var d = m[1].padStart(2, '0');
        var mo = ((_a = months[m[2].toLowerCase()]) !== null && _a !== void 0 ? _a : 1).toString().padStart(2, '0');
        var y = m[3].length === 2 ? "20".concat(m[3]) : m[3];
        return "".concat(y, "-").concat(mo, "-").concat(d);
    }
    m = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (m) {
        var d = m[1].padStart(2, '0');
        var mo = m[2].padStart(2, '0');
        var y = m[3].length === 2 ? "20".concat(m[3]) : m[3];
        return "".concat(y, "-").concat(mo, "-").concat(d);
    }
    return null;
}
/** Extract ISO date from SMS body. Falls back to today's date. */
function extractDateFromBody(body) {
    // Common patterns: "Dt:01-Mar-2026", "on 01-Mar-26", "Date: 05/03/2026"
    var datePatterns = [
        /(?:dt|date)[:\s]+(\d{1,2}[-\/\s][A-Za-z]{3}[-\/\s]\d{2,4})/i,
        /(?:on|dated?)\s+(\d{1,2}[-\/][A-Za-z]{3}[-\/]\d{2,4})/i,
        /(?:on|dated?)\s+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
        /(\d{1,2}[-\/][A-Za-z]{3}[-\/]\d{2,4})/,
        /(\d{2}\/\d{2}\/\d{4})/,
    ];
    for (var _i = 0, datePatterns_1 = datePatterns; _i < datePatterns_1.length; _i++) {
        var p = datePatterns_1[_i];
        var m = body.match(p);
        if (m === null || m === void 0 ? void 0 : m[1]) {
            var parsed = parseMonthDayYear(m[1]);
            if (parsed)
                return parsed;
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
var SIP_CONFIRMATION_PATTERNS = [
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
function classifySIPConfirmation(body, sender) {
    var isAMC = isAMCSender(sender);
    var matched = isAMC || SIP_CONFIRMATION_PATTERNS.some(function (p) { return p.test(body); });
    if (!matched)
        return null;
    // Extract amount — try multiple patterns in order of specificity
    var amount = (function () {
        var patterns = [
            /(?:SIP Amount|Investment Amount|Amount|SIP of|invested)[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i,
            /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s+(?:in|for|invested)/i,
            /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i,
        ];
        for (var _i = 0, patterns_1 = patterns; _i < patterns_1.length; _i++) {
            var p = patterns_1[_i];
            var m = body.match(p);
            if (m)
                return parseAmount(m[1]);
        }
        return 0;
    })();
    // Extract fund name — cover Scheme, Fund, folio...in, quoted name formats
    var fundName = 'Mutual Fund SIP';
    var fundPatterns = [
        /(?:Scheme|Fund)[:\s]+([A-Z][A-Za-z0-9\s&\-()]{4,60}?)(?:\s*[-–]\s*(?:Direct|Regular|Growth|Dividend)|Plan|Folio|\.|$)/i,
        /(?:in|for)\s+([A-Z][A-Za-z0-9\s&\-()]{4,60}?)\s+(?:Fund|Plan|Scheme|Dir|Direct|Regular|Growth)/i,
        /(?:invested|investment)\s+in\s+([A-Z][A-Za-z0-9\s&\-()]{4,60}?)(?:\s*\.|,|\s+Folio)/i,
        /([A-Z][A-Za-z0-9\s&\-()]{5,60}?)\s+(?:SIP|Mutual Fund|MF)\b/i,
    ];
    for (var _i = 0, fundPatterns_1 = fundPatterns; _i < fundPatterns_1.length; _i++) {
        var p = fundPatterns_1[_i];
        var m = body.match(p);
        if (m === null || m === void 0 ? void 0 : m[1]) {
            fundName = m[1].trim();
            break;
        }
    }
    // Extract units — try "units allotted X", "X units", "Units:X"
    var unitsMatch = body.match(/(?:Units?|units?\s+allotted)[:\s]*([\d,]+\.?\d+)/i) ||
        body.match(/for\s+([\d,]+\.?\d+)\s+units?/i) ||
        body.match(/Units?[:\s]*([\d,]+\.?\d+)/i);
    var units = unitsMatch ? parseAmount(unitsMatch[1]) : undefined;
    // Extract NAV
    var navMatch = body.match(/NAV[:\s]*(?:of\s+)?(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i) ||
        body.match(/(?:NAV|Price)[:\s]*([\d,]+\.?\d+)/i);
    var nav = navMatch ? parseAmount(navMatch[1]) : undefined;
    // Extract folio — "Folio:1234567", "Folio No: 1234567", "Folio Number 1234567"
    var folioMatch = body.match(/Folio\s*(?:No\.?|Number)?[:\s]*(\d+)/i);
    var folio = folioMatch === null || folioMatch === void 0 ? void 0 : folioMatch[1];
    return {
        kind: 'sip_confirmation',
        amount: amount,
        fundName: fundName,
        units: units,
        nav: nav,
        folio: folio,
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
var EMI_DEDUCTION_PATTERNS = [
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
function classifyEMIDeduction(body) {
    var _a;
    var matched = EMI_DEDUCTION_PATTERNS.some(function (p) { return p.test(body); });
    if (!matched)
        return null;
    // Extract EMI amount — more specific patterns first
    var emiMatch = body.match(/EMI\s+(?:of\s+)?(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i) ||
        body.match(/(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s+(?:debited|deducted).*?(?:EMI|loan)/i) ||
        body.match(/NACH\s+Debit\s+(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i) ||
        body.match(/(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*).*?loan\s+EMI/i);
    var emiAmount = emiMatch ? parseAmount(emiMatch[1]) : extractAmountStr(body);
    // Outstanding balance (useful for loan progress updates)
    var outstandingMatch = body.match(/outstanding[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i) ||
        body.match(/outstanding\s+loan[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i);
    var outstandingAmount = outstandingMatch ? parseAmount(outstandingMatch[1]) : undefined;
    // Detect lender / loan type
    var lenderPatterns = [
        /(?:towards|for)\s+(?:your\s+)?([A-Za-z][A-Za-z0-9\s\-&.]{2,40}?)\s+(?:loan|EMI|account|a\/c)/i,
        /(?:Home|Car|Personal|Education|Business)\s+Loan/i,
        /([A-Z]{4,20})\s+(?:Home|Car|Personal|Education)?Loan/i,
    ];
    var lenderHint = 'Loan';
    for (var _i = 0, lenderPatterns_1 = lenderPatterns; _i < lenderPatterns_1.length; _i++) {
        var p = lenderPatterns_1[_i];
        var m = body.match(p);
        if (m) {
            lenderHint = ((_a = m[1]) !== null && _a !== void 0 ? _a : m[0]).trim();
            break;
        }
    }
    var loanAcMatch = body.match(/loan\s*(?:a\/c|account|no\.?)[:\s]*[Xx*]*(\d{3,6})/i) ||
        body.match(/(?:Loan|loan).*?[Xx*]{2,}(\d{3,6})/);
    return {
        kind: 'emi_deduction',
        emiAmount: emiAmount,
        lenderHint: lenderHint,
        loanAccountHint: loanAcMatch === null || loanAcMatch === void 0 ? void 0 : loanAcMatch[1],
        bankName: null,
        accountLast4: extractAccountLast4(body),
    };
}
// 3. Account Balance
var ACCOUNT_BALANCE_PATTERNS = [
    /avail(?:able)?\s*(?:bal(?:ance)?|limit)/i,
    /(?:closing|opening|current)\s+bal(?:ance)?/i,
    /a\/c\s+balance/i,
    /(?:balance|bal)(?:\s+is|:)\s*(?:Rs\.?|INR|₹)/i,
    /your\s+(?:account\s+)?balance/i,
    /(?:account|a\/c).*?(?:balance|bal).*?(?:Rs\.?|INR|₹)/i,
];
function classifyAccountBalance(body) {
    var matched = ACCOUNT_BALANCE_PATTERNS.some(function (p) { return p.test(body); });
    if (!matched)
        return null;
    // Skip if it's primarily an expense/income SMS with a trailing balance line
    var isTransaction = /(?:debited|credited|paid|received|UPI|NEFT|IMPS)\s+(?:Rs\.?|INR|₹)/i.test(body);
    if (isTransaction)
        return null;
    var availMatch = body.match(/avail(?:able)?\s*(?:bal(?:ance)?|limit)[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i) ||
        body.match(/(?:balance|bal)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i) ||
        body.match(/(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i);
    var balance = availMatch ? parseAmount(availMatch[1]) : 0;
    if (!balance)
        return null;
    return {
        kind: 'account_balance',
        balance: balance,
        bankName: null,
        accountLast4: extractAccountLast4(body),
    };
}
// 4. Loan Alert / Due Reminder / Insurance Premium
var LOAN_ALERT_PATTERNS = [
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
function classifyLoanAlert(body) {
    var _a;
    var matched = LOAN_ALERT_PATTERNS.some(function (p) { return p.test(body); });
    if (!matched)
        return null;
    var amountMatch = body.match(/(?:EMI|due|payment|premium)[:\s]+(?:Rs\.?|INR|₹)\s*[Xx*]*\s*([\d,]+\.?\d*)/i) ||
        body.match(/(?:Rs\.?|INR|₹)\s*[Xx*]*\s*([\d,]+\.?\d*).*?(?:due|EMI|premium)/i);
    var dueAmount = amountMatch ? parseAmount(amountMatch[1]) : undefined;
    var dateMatch = body.match(/(?:due\s+(?:on|by|date)|payment\s+date)[:\s]*(\d{1,2}[\/\-\s][A-Za-z0-9]{2,3}[\/\-\s]\d{2,4})/i) ||
        body.match(/(?:on|by)\s+(\d{1,2}[\/\-][A-Za-z]{3}[\/\-]\d{2,4})/i);
    var dueDate = dateMatch ? (_a = parseMonthDayYear(dateMatch[1])) !== null && _a !== void 0 ? _a : undefined : undefined;
    var lenderMatch = body.match(/(?:your|for)\s+([A-Za-z][A-Za-z\s\-&.]{3,40}?)\s+(?:loan|EMI|account|policy)/i) ||
        body.match(/^([A-Za-z\s]+?)\s+(?:Premium|Policy|Loan)/i);
    var lenderHint = 'Loan/Premium';
    if (lenderMatch === null || lenderMatch === void 0 ? void 0 : lenderMatch[1]) {
        lenderHint = lenderMatch[1].trim();
    }
    else if (body.toLowerCase().includes('lic')) {
        lenderHint = 'LIC';
    }
    return { kind: 'loan_alert', dueAmount: dueAmount, dueDate: dueDate, lenderHint: lenderHint, bankName: null };
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
function parseSIPAllotment(rawBody, sender) {
    var _a;
    var body = (0, smsParser_1.normaliseSMSBody)(rawBody);
    // Quick gate — must contain allotment/SIP/NAV keywords
    var isAllotment = /units?\s+allotted/i.test(body) ||
        /allotment\s+(?:date|confirmation|notice|for)/i.test(body) ||
        (/\bSIP\b.*?(?:processed|successful|confirmed|executed)/i.test(body) && isAMCSender(sender)) ||
        (/(?:purchase|subscription)\s+confirmation/i.test(body));
    if (!isAllotment && !isAMCSender(sender))
        return null;
    // Must be SIP-like (has NAV or units)
    var hasNAV = /NAV[:\s]*([\d,]+\.?\d+)/i.test(body);
    var hasUnits = /units?[:\s]*([\d,]+\.?\d+)/i.test(body) || /units?\s+allotted/i.test(body);
    if (!hasNAV && !hasUnits)
        return null;
    // Amount
    var amountPatterns = [
        /(?:SIP Amount|Amount|SIP of|for\s+(?:Rs\.?|INR|₹))[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i,
        /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s+(?:in|invested|for)/i,
        /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i,
    ];
    var amount = 0;
    for (var _i = 0, amountPatterns_1 = amountPatterns; _i < amountPatterns_1.length; _i++) {
        var p = amountPatterns_1[_i];
        var m = body.match(p);
        if (m) {
            amount = parseAmount(m[1]);
            break;
        }
    }
    // Units — "Units allotted 11.841", "Units:12.345", "for 11.841 units", "for 2.098 units has been processed"
    var unitsPatterns = [
        /units?\s+allotted\s*([\d,]+\.?\d+)/i,
        /(?:Units?|Qty)[:\s]*([\d,]+\.?\d+)/i,
        /for\s+([\d,]+\.?\d+)\s+units?/i,
        /([\d,]+\.?\d+)\s+units?\s+(?:allotted|credited)/i,
    ];
    var units = 0;
    for (var _b = 0, unitsPatterns_1 = unitsPatterns; _b < unitsPatterns_1.length; _b++) {
        var p = unitsPatterns_1[_b];
        var m = body.match(p);
        if (m) {
            units = parseAmount(m[1]);
            break;
        }
    }
    // NAV — "NAV:84.32", "NAV Rs.84.32", "NAV: 84.32", "NAV of Rs.476.62"
    var navMatch = body.match(/NAV[:\s]+(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d+)/i) ||
        body.match(/(?:NAV|Price)[:\s]*([\d,]+\.?\d+)/i) ||
        body.match(/NAV\s+(?:of\s+)?(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d+)/i);
    var nav = navMatch ? parseAmount(navMatch[1]) : 0;
    // Folio — "Folio:1234567", "Folio No: 1234567", "Folio Number: 1234567"
    var folioMatch = body.match(/Folio\s*(?:No\.?|Number)?[:\s]*(\d{4,12})/i);
    var folioNumber = (_a = folioMatch === null || folioMatch === void 0 ? void 0 : folioMatch[1]) !== null && _a !== void 0 ? _a : '';
    // Fund name
    var fundName = 'Mutual Fund SIP';
    var fundPatterns = [
        /(?:scheme|fund)[:\s]+([A-Z][A-Za-z0-9\s&\()\-]{4,60}?)(?:\s*[-–]\s*(?:Direct|Regular|Growth|Dividend)|Plan|Folio|\s*Dt|\.|$)/i,
        /Folio\s*\d+.*?in\s+([A-Z][A-Za-z0-9\s&\()\-]{4,60}?)(?:\s*[-–]\s*(?:Direct|Regular|Growth|Dividend)|Plan|Folio|\s*Dt|\.|$)/i,
        /(?:in|for)\s+([A-Z][A-Za-z0-9\s&\()\-]{4,60}?)\s+(?:Fund|Plan|Scheme|Dir|Direct|Regular|Growth)/i,
        /([A-Z][A-Za-z0-9\s&\()\-]{5,60}?)\s+(?:SIP|Mutual Fund|MF|Index Fund)\b/i,
    ];
    for (var _c = 0, fundPatterns_2 = fundPatterns; _c < fundPatterns_2.length; _c++) {
        var p = fundPatterns_2[_c];
        var m = body.match(p);
        if ((m === null || m === void 0 ? void 0 : m[1]) && !m[1].toLowerCase().includes('folio')) {
            fundName = m[1].trim();
            break;
        }
    }
    var date = extractDateFromBody(body);
    return {
        amount: amount,
        fundName: fundName,
        units: units,
        nav: nav,
        folioNumber: folioNumber,
        date: date,
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
function parseLoanEMI(rawBody) {
    var _a;
    var body = (0, smsParser_1.normaliseSMSBody)(rawBody);
    var matched = EMI_DEDUCTION_PATTERNS.some(function (p) { return p.test(body); });
    if (!matched)
        return null;
    // EMI amount
    var emiPatterns = [
        /EMI\s+(?:of\s+)?(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i,
        /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s+(?:debited|deducted).*?(?:EMI|loan)/i,
        /NACH\s+Debit\s+(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i,
        /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*).*?loan\s+EMI/i,
        /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s+debited/i,
    ];
    var emiAmount = 0;
    for (var _i = 0, emiPatterns_1 = emiPatterns; _i < emiPatterns_1.length; _i++) {
        var p = emiPatterns_1[_i];
        var m = body.match(p);
        if (m) {
            emiAmount = parseAmount(m[1]);
            break;
        }
    }
    if (!emiAmount)
        emiAmount = extractAmountStr(body);
    // Outstanding balance
    var outstandingMatch = body.match(/outstanding[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i) ||
        body.match(/outstanding\s+loan[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i);
    var outstandingAmount = outstandingMatch ? parseAmount(outstandingMatch[1]) : undefined;
    // Lender / loan type
    var lenderPatterns = [
        /(?:towards|for)\s+(?:your\s+)?([A-Za-z][A-Za-z0-9\s\-&.]{2,40}?)\s+(?:loan|EMI|account|a\/c)/i,
        /(Home|Car|Personal|Education|Business)\s+Loan/i,
    ];
    var lenderHint = 'Loan';
    for (var _b = 0, lenderPatterns_2 = lenderPatterns; _b < lenderPatterns_2.length; _b++) {
        var p = lenderPatterns_2[_b];
        var m = body.match(p);
        if (m) {
            lenderHint = ((_a = m[1]) !== null && _a !== void 0 ? _a : m[0]).trim();
            break;
        }
    }
    // Loan account last 4
    var loanAcMatch = body.match(/(?:[Ll]oan\s*(?:a\/c|account|ending|no\.?)[:\s]*[Xx*]*)(\d{3,6})/i) ||
        body.match(/(?:[Ll]oan|loan).*?[Xx*]{2,}(\d{3,6})/);
    var loanAccountHint = loanAcMatch === null || loanAcMatch === void 0 ? void 0 : loanAcMatch[1];
    var date = extractDateFromBody(body);
    return {
        emiAmount: emiAmount,
        lenderHint: lenderHint,
        loanAccountHint: loanAccountHint,
        outstandingAmount: outstandingAmount,
        date: date,
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
function parseStockBuy(rawBody) {
    var body = (0, smsParser_1.normaliseSMSBody)(rawBody);
    // Gate: must look like a buy confirmation
    var isBuy = /\b(?:bought|buy|purchase[d]?)\b/i.test(body) &&
        /\b(?:NSE|BSE)\b/.test(body);
    if (!isBuy)
        return null;
    // Zerodha: "Bought 10 INFY @ 1895.00 on NSE"
    var zerodha = body.match(/[Bb]ought\s+(\d+)\s+([A-Z&]+)\s+@\s*([\d,.]+)\s+on\s+(NSE|BSE)/i);
    if (zerodha) {
        var quantity = parseInt(zerodha[1], 10);
        var price = parseAmount(zerodha[3]);
        return {
            action: 'buy',
            quantity: quantity,
            ticker: zerodha[2].toUpperCase(),
            price: price,
            exchange: zerodha[4].toUpperCase(),
            total: quantity * price,
            date: extractDateFromBody(body),
        };
    }
    // Groww / general: "Bought 5 RELIANCE at Rs.2850 on NSE"
    var groww = body.match(/(?:order\s+executed.*?)?[Bb]ought\s+(\d+)\s+([A-Z&]+)\s+at\s+(?:Rs\.?|INR|₹)?\s*([\d,.]+)\s+on\s+(NSE|BSE)/i);
    if (groww) {
        var quantity = parseInt(groww[1], 10);
        var price = parseAmount(groww[3]);
        return {
            action: 'buy',
            quantity: quantity,
            ticker: groww[2].toUpperCase(),
            price: price,
            exchange: groww[4].toUpperCase(),
            total: quantity * price,
            date: extractDateFromBody(body),
        };
    }
    // Upstox / Angel: "BUY 15 TATAMOTORS @ 945.50 NSE"
    var upstox = body.match(/\bBUY\s+(\d+)\s+([A-Z&]+)\s+@\s*([\d,.]+)\s+(NSE|BSE)/i) ||
        body.match(/to\s+BUY\s+(\d+)\s+([A-Z&]+)\s+at\s+(?:Rs\.?|INR|₹)?\s*([\d,.]+)\s+on\s+(NSE|BSE)/i);
    if (upstox) {
        var quantity = parseInt(upstox[1], 10);
        var price = parseAmount(upstox[3]);
        return {
            action: 'buy',
            quantity: quantity,
            ticker: upstox[2].toUpperCase(),
            price: price,
            exchange: upstox[4].toUpperCase(),
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
function parseStockSell(rawBody) {
    var body = (0, smsParser_1.normaliseSMSBody)(rawBody);
    var isSell = /\b(?:sold|sell)\b/i.test(body) && /\b(?:NSE|BSE)\b/.test(body);
    if (!isSell)
        return null;
    // "Sold 10 INFY @ 1930.00 on NSE"
    var m = body.match(/[Ss]old\s+(\d+)\s+([A-Z&]+)\s+@\s*([\d,.]+)\s+on\s+(NSE|BSE)/i) ||
        body.match(/[Ss]old\s+(\d+)\s+([A-Z&]+)\s+at\s+(?:Rs\.?|INR|₹)?\s*([\d,.]+)\s+on\s+(NSE|BSE)/i) ||
        body.match(/SELL\s+(\d+)\s+([A-Z&]+)\s+@\s*([\d,.]+)\s+(NSE|BSE)/i);
    if (!m)
        return null;
    var quantity = parseInt(m[1], 10);
    var price = parseAmount(m[3]);
    return {
        action: 'sell',
        quantity: quantity,
        ticker: m[2].toUpperCase(),
        price: price,
        exchange: m[4].toUpperCase(),
        total: quantity * price,
        date: extractDateFromBody(body),
    };
}
/**
 * Parse a bank NACH debit SMS that was made towards a Mutual Fund SIP, but lacks
 * units/NAV. Usually formatted with an Info section.
 * Example: "UPDATE: INR 5,000.00 debited from HDFC Bank XX1088 on 27-FEB-26. Info: NIPPONMUTUALFUND_367624509_162207359"
 */
function parseNACHMFDebit(rawBody, sender) {
    var body = (0, smsParser_1.normaliseSMSBody)(rawBody);
    // Look for the "Info: AMCNAME_FOLIONUMBER_TRXID" pattern
    var infoMatch = body.match(/Info[:\s]*([A-Z0-9]+MUTUALFUND)_(\d+)_/i) ||
        body.match(/Info[:\s]*([A-Z0-9]+MF)_(\d+)_/i);
    if (!infoMatch)
        return null;
    // Must be a debit/payment
    if (!/(?:debited|deducted|paid|payment|auto.*debit|NACH)/i.test(body))
        return null;
    // Extract Amount
    var amountMatch = body.match(/(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i);
    var amount = amountMatch ? parseAmount(amountMatch[1]) : 0;
    if (!amount)
        return null;
    // Clean AMC Name
    var amcName = infoMatch[1].replace(/MUTUALFUND|MF/i, '').trim();
    if (amcName.toUpperCase() === 'NIPPON')
        amcName = 'Nippon India';
    var folioNumber = infoMatch[2];
    return {
        amount: amount,
        amcName: amcName,
        folioNumber: folioNumber,
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
function classifySMSIntent(rawBody, sender) {
    if (!(rawBody === null || rawBody === void 0 ? void 0 : rawBody.trim()))
        return { kind: 'unknown' };
    // Normalise multiline SMS before classification
    var body = (0, smsParser_1.normaliseSMSBody)(rawBody);
    var sip = classifySIPConfirmation(body, sender);
    if (sip)
        return sip;
    var loanAlert = classifyLoanAlert(body);
    if (loanAlert)
        return loanAlert;
    var emi = classifyEMIDeduction(body);
    if (emi)
        return emi;
    var balance = classifyAccountBalance(body);
    if (balance)
        return balance;
    return { kind: 'transaction' };
}
