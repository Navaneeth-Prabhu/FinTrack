// scripts/testSMSParser.ts
// Standalone test for the SMS parser — run with: npx ts-node scripts/testSMSParser.ts
// Tests bank detection, amount+type extraction, merchant extraction, and confidence scoring.

import { extractTransactionFromSMS } from '../services/smsParser';

interface TestCase {
    label: string;
    sender: string;
    body: string;
    expect: {
        type?: string;
        amountRange?: [number, number];
        merchant?: string;
        bank?: string;
        confidenceMin?: number;
    };
}

const TESTS: TestCase[] = [
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
];

// ─── Simple assertion helper ──────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail: string) {
    if (condition) {
        console.log(`  ✅ ${label}: ${detail}`);
        passed++;
    } else {
        console.error(`  ❌ ${label}: ${detail}`);
        failed++;
    }
}

// ─── Run tests ────────────────────────────────────────────────────────────────
console.log('\n🧪 SMS Parser Test Suite\n' + '─'.repeat(60));

for (const t of TESTS) {
    console.log(`\n[${t.label}]`);
    console.log(`  Sender: ${t.sender}`);
    console.log(`  Body:   ${t.body.slice(0, 80)}...`);

    const result = extractTransactionFromSMS(t.body, t.sender);

    if (t.expect.type === undefined) {
        // Non-financial — expect null
        check('returns null for non-financial', result === null, result === null ? 'null ✓' : `got ${JSON.stringify(result)}`);
        continue;
    }

    if (!result) {
        console.error('  ❌ No result returned (expected a transaction)');
        failed += 4;
        continue;
    }

    console.log(`  → type=${result.type} amount=${result.amount} merchant="${result.merchant}" bank="${result.bank}" conf=${result.confidence.toFixed(2)}`);

    if (t.expect.type) {
        check('type', result.type === t.expect.type, `${result.type} === ${t.expect.type}`);
    }
    if (t.expect.amountRange) {
        const [lo, hi] = t.expect.amountRange;
        check('amount', result.amount >= lo && result.amount <= hi, `${result.amount} in [${lo}, ${hi}]`);
    }
    if (t.expect.merchant) {
        check('merchant', (result.merchant ?? '').toLowerCase().includes(t.expect.merchant.toLowerCase()), `"${result.merchant}" includes "${t.expect.merchant}"`);
    }
    if (t.expect.bank) {
        check('bank', result.bank === t.expect.bank, `"${result.bank}" === "${t.expect.bank}"`);
    }
    if (t.expect.confidenceMin !== undefined) {
        check('confidence', result.confidence >= t.expect.confidenceMin, `${result.confidence.toFixed(2)} >= ${t.expect.confidenceMin}`);
    }
}

console.log('\n' + '─'.repeat(60));
console.log(`🏁 Results: ${passed} passed, ${failed} failed out of ${passed + failed} assertions`);
if (failed === 0) {
    console.log('✅ All tests passed!\n');
} else {
    console.log(`⚠️  ${failed} assertion(s) need review\n`);
    process.exit(1);
}
