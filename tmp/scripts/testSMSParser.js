"use strict";
// scripts/testSMSParser.ts
// Standalone test for the SMS parser — run with: npx ts-node scripts/testSMSParser.ts
// Tests bank detection, amount+type extraction, merchant extraction, and confidence scoring.
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var smsParser_1 = require("../services/smsParser");
var TESTS = [
    {
        label: 'HDFC UPI debit',
        sender: 'VM-HDFCBK',
        body: 'Rs.450.00 has been debited from your HDFC Bank A/c **4832 by VPA swiggy@kotak SWIGGY FOOD on 20-Feb-26. Available balance: Rs.12340.00',
        expect: { type: 'expense', amountRange: [449, 451], merchant: 'Swiggy', bank: 'HDFC Bank', confidenceMin: 0.8 },
    },
    {
        label: 'ICICI credit (salary)',
        sender: 'VK-ICICIB',
        body: 'INR 85000.00 credited to your ICICI Bank account XX1234 from INFOSYS LTD. SALARY on 01-Mar-26. Available Bal: INR 85340.00',
        expect: { type: 'income', amountRange: [84999, 85001], confidenceMin: 0.7 },
    },
    {
        label: 'SBI debit card purchase',
        sender: 'AD-SBINB',
        body: 'INR 1299.00 debited from SBI A/c X3456 at AMAZON INDIA on 19-Feb-26. If not done by you, call 1800-1234.',
        expect: { type: 'expense', amountRange: [1298, 1300], merchant: 'Amazon', bank: 'SBI', confidenceMin: 0.7 },
    },
    {
        label: 'Axis Bank statement',
        sender: 'JD-AXISBK',
        body: 'Rs 599 debited from your Axis Bank Account ending 1234 for NETFLIX INDIA on 18-02-26.',
        expect: { type: 'expense', amountRange: [598, 600], merchant: 'Netflix', confidenceMin: 0.6 },
    },
    {
        label: 'PhonePe UPI send',
        sender: 'BP-PHNPAY',
        body: 'Rs. 250 paid to Rohit Sharma via PhonePe on 21 Feb 2026. UPI Ref: 316789021234.',
        expect: { type: 'expense', amountRange: [249, 251], confidenceMin: 0.5 },
    },
    {
        label: 'Unknown bank generic pattern',
        sender: 'VK-BANKLT',
        body: 'Your account has been debited by INR 3500.00 for EMI payment towards HDFC HOME LOAN. Available balance: INR 25000.',
        expect: { type: 'expense', amountRange: [3499, 3501], confidenceMin: 0.35 },
    },
    {
        label: 'OTP/non-financial message (should return null)',
        sender: 'TM-ICICIB',
        body: 'Your OTP for login is 293847. Valid for 10 minutes.',
        expect: { type: undefined, amountRange: undefined },
    },
    {
        label: 'Kotak debit with credit card',
        sender: 'VM-KOTAKB',
        body: 'INR 2149.00 debited from Kotak Credit Card XX5678 at ZOMATO on 20-02-26 12:34:56.',
        expect: { type: 'expense', amountRange: [2148, 2150], merchant: 'Zomato', confidenceMin: 0.6 },
    },
    {
        label: 'SBI refund credit',
        sender: 'BZ-SBINB',
        body: 'INR 499.00 credited to your SBI account XX4321 as refund from FLIPKART on 21-Feb-2026.',
        expect: { type: 'income', amountRange: [498, 500], merchant: 'Flipkart', confidenceMin: 0.6 },
    },
    {
        label: 'Comma-formatted large amount',
        sender: 'VM-HDFCBK',
        body: 'Rs.1,24,500.00 has been debited from your HDFC Bank A/c **9876 by VPA hdfc@hdfcbank on 01-Jan-26.',
        expect: { type: 'expense', amountRange: [124499, 124501], confidenceMin: 0.7 },
    },
    {
        label: 'New Format HDFC Sent Rs. (Target Bug)',
        sender: 'VM-HDFCBK',
        body: 'Sent Rs.32.00 From HDFC Bank A/C *1088 To PADMA MEDICALS On 09/03/26 Ref 606857221877 Not You? Call 18002586161/SMS BLOCK UPI to 7308080808',
        expect: { type: 'expense', amountRange: [31, 33], merchant: 'PADMA MEDICALS', bank: 'HDFC Bank', confidenceMin: 0.7 },
    },
    {
        label: 'New Format ICICI Sent Rs.',
        sender: 'VK-ICICIB',
        body: 'Sent INR 1,500.00 from ICICI Bank A/C XX5678 to RAM NAIDU on 11/04/2026 Ref 123456789. Avail Bal: INR 12000.',
        expect: { type: 'expense', amountRange: [1499, 1501], merchant: 'RAM NAIDU', bank: 'ICICI Bank', confidenceMin: 0.7 },
    },
    {
        label: 'New Format SBI Transferred Rs.',
        sender: 'AD-SBINB',
        body: 'Transferred Rs. 540.50 From SBI Bank A/C *9999 To Zomato Online on 12/12/26 Ref 9876543210 Not You? Call Bank',
        expect: { type: 'expense', amountRange: [539, 542], merchant: 'Zomato', bank: 'SBI', confidenceMin: 0.7 },
    },
    {
        label: 'Generic New Format pattern without bank sender match',
        sender: 'XY-CANARA', // CANARA not implicitly caught in BANK_SENDER_MAP explicitly maybe
        body: 'Sent Rs.999.00 From Canara Bank A/C *9723 To RENT PAYMENT On 05/05/2026. Ref 555555555.',
        expect: { type: 'expense', amountRange: [998, 1000], merchant: 'RENT PAYMENT', confidenceMin: 0.4 },
    }
];
// ─── Simple assertion helper ──────────────────────────────────────────────────
var passed = 0;
var failed = 0;
function check(label, condition, detail) {
    if (condition) {
        console.log("  \u2705 ".concat(label, ": ").concat(detail));
        passed++;
    }
    else {
        console.error("  \u274C ".concat(label, ": ").concat(detail));
        failed++;
    }
}
// ─── Run tests ────────────────────────────────────────────────────────────────
console.log('\n🧪 SMS Parser Test Suite\n' + '─'.repeat(60));
for (var _i = 0, TESTS_1 = TESTS; _i < TESTS_1.length; _i++) {
    var t = TESTS_1[_i];
    console.log("\n[".concat(t.label, "]"));
    console.log("  Sender: ".concat(t.sender));
    console.log("  Body:   ".concat(t.body.slice(0, 80), "..."));
    var result = (0, smsParser_1.extractTransactionFromSMS)(t.body, t.sender);
    if (t.expect.type === undefined) {
        // Non-financial — expect null
        check('returns null for non-financial', result === null, result === null ? 'null ✓' : "got ".concat(JSON.stringify(result)));
        continue;
    }
    if (!result) {
        console.error('  ❌ No result returned (expected a transaction)');
        failed += 4;
        continue;
    }
    console.log("  \u2192 type=".concat(result.type, " amount=").concat(result.amount, " merchant=\"").concat(result.merchant, "\" bank=\"").concat(result.bank, "\" conf=").concat(result.confidence.toFixed(2)));
    if (t.expect.type) {
        check('type', result.type === t.expect.type, "".concat(result.type, " === ").concat(t.expect.type));
    }
    if (t.expect.amountRange) {
        var _b = t.expect.amountRange, lo = _b[0], hi = _b[1];
        check('amount', result.amount >= lo && result.amount <= hi, "".concat(result.amount, " in [").concat(lo, ", ").concat(hi, "]"));
    }
    if (t.expect.merchant) {
        check('merchant', ((_a = result.merchant) !== null && _a !== void 0 ? _a : '').toLowerCase().includes(t.expect.merchant.toLowerCase()), "\"".concat(result.merchant, "\" includes \"").concat(t.expect.merchant, "\""));
    }
    if (t.expect.bank) {
        check('bank', result.bank === t.expect.bank, "\"".concat(result.bank, "\" === \"").concat(t.expect.bank, "\""));
    }
    if (t.expect.confidenceMin !== undefined) {
        check('confidence', result.confidence >= t.expect.confidenceMin, "".concat(result.confidence.toFixed(2), " >= ").concat(t.expect.confidenceMin));
    }
}
console.log('\n' + '─'.repeat(60));
console.log("\uD83C\uDFC1 Results: ".concat(passed, " passed, ").concat(failed, " failed out of ").concat(passed + failed, " assertions"));
if (failed === 0) {
    console.log('✅ All tests passed!\n');
}
else {
    console.log("\u26A0\uFE0F  ".concat(failed, " assertion(s) need review\n"));
    process.exit(1);
}
