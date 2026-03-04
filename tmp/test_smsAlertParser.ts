/**
 * Manual test script for Day 4: smsAlertParser named parsers.
 * Run with: npx ts-node --project tsconfig.json tmp/test_smsAlertParser.ts
 *
 * Expected: All SIP_TESTS and EMI_TESTS should produce non-null results
 * with the fields shown in each test's comment.
 */

// Note: this script uses direct string matching so it can be run standalone
// without the full React Native environment.

// ─── Inline helpers (mirrors normaliseSMSBody) ─────────────────────────────
function normalise(body: string): string {
    return body.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ')
        .replace(/\s{2,}/g, ' ').trim();
}

function parseAmt(s: string) { return parseFloat(s.replace(/,/g, '').replace(/[^\d.]/g, '')) || 0; }

// ─── SIP Allotment test cases ──────────────────────────────────────────────
// These match the 10 real formats described in IMPLEMENTATION.md Section 5.2
const SIP_TESTS: string[] = [
    // 1. SBI MF — units allotted format
    "Units allotted 11.841 for Rs.999 in Valu Fund Folio:1234567 NAV:84.32 Dt:01-Mar-2026",
    // 2. HDFC MF — processed format
    "Your SIP of Rs.1000 in HDFC Mid Cap Fund has been processed. Units:12.345 NAV:81.02 Folio:90123456 -HDFCMF",
    // 3. ICICI Pru — invested format
    "Dear Investor, Rs.5000 invested in ICICI Pru Bluechip Fund. Units allotted: 89.23, NAV: 56.04, Folio: 2345678",
    // 4. CAMS RTA — confirmation format
    "SIP payment of INR 2500 processed for fund XYZ Liquid Fund. NAV: 45.23, Units: 55.27, Folio: 345678. -CAMSCO",
    // 5. Groww — platform format
    "Your SIP of Rs.500 in Mirae Asset Emerging BlueChip Fund (Dir-Growth) is successful. Units:4.321 NAV:115.87 Folio:9012345",
    // 6. PPFAS — Parag Parikh format
    "Units allotted 8.645 Folio 5678901 NAV Rs.115.67 scheme Parag Parikh Flexi Cap Fund Dt:01-Mar-26",
    // 7. Multiline SMS (should still parse after normalisation)
    "SIP of Rs.3000 processed.\nUnits:26.123 NAV:114.80\nFolio:7890123 -AXISMF",
    // 8. Nippon India — allotment notice format
    "Allotment Confirmation: 33.456 units of Nippon India Large Cap Fund allotted. Amount: Rs.1500 NAV: 44.83 Folio: 6781234",
    // 9. UTI — scheme format
    "Purchase Confirmation: Rs.2000 in UTI Nifty 50 Index Fund. Units:14.567 NAV:137.30 Folio: 8901234",
    // 10. Aditya Birla — subscription format
    "Subscription Confirmation- Rs.4000 invested in Aditya Birla Sun Life Frontline Equity Fund. Units allotted: 67.12 NAV: 59.60 Folio:1234567",
];

// ─── EMI Deduction test cases ──────────────────────────────────────────────
const EMI_TESTS: string[] = [
    // 1. SBI — standard EMI format with outstanding
    "EMI of Rs.35000 debited from A/C XX4521 for Loan A/C XX9876. Outstanding: Rs.27,20,000. -SBI",
    // 2. HDFC — home loan format
    "Your Home Loan EMI of INR 18500.00 has been debited from your a/c XXXX1234. Outstanding: 14,50,200.00",
    // 3. ICICI — car loan format
    "Dear Customer, Rs.45000 debited from your account XXXX5678 towards your Car Loan EMI. -ICICIB",
    // 4. Axis — standard format
    "EMI of Rs.8500 for Loan A/c XX7890 debited from your Axis Bank a/c. -AXISBK",
    // 5. NACH debit format
    "NACH Debit Rs.5500 towards Home Loan EMI. A/c: XXXX6789. Outstanding: Rs.22,40,000",
];

// ─── Run tests ─────────────────────────────────────────────────────────────
console.log('\n====== Day 4: parseSIPAllotment tests ======\n');
let sipPassed = 0;
SIP_TESTS.forEach((sms, i) => {
    const body = normalise(sms);

    // Quick SIP check (mirrors parseSIPAllotment logic)
    const isAllotment =
        /units?\s+allotted/i.test(body) ||
        /allotment\s+(?:date|confirmation|notice|for)/i.test(body) ||
        /\bSIP\b.*?(?:processed|successful|confirmed|executed)/i.test(body) ||
        /(?:purchase|subscription)\s+confirmation/i.test(body);

    const hasNAV = /NAV[:\s]*([\d,]+\.?\d+)/i.test(body);
    const hasUnits = /units?[:\s]*([\d,]+\.?\d+)/i.test(body) || /units?\s+allotted/i.test(body);

    // Extract key fields
    const navM = body.match(/NAV[:\s]+(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d+)/i) || body.match(/(?:NAV|Price)[:\s]*([\d,]+\.?\d+)/i);
    const nav = navM ? parseAmt(navM[1]) : 0;

    const unitsM = body.match(/units?\s+allotted\s*([\d,]+\.?\d+)/i) ||
        body.match(/(?:Units?|Qty)[:\s]*([\d,]+\.?\d+)/i) ||
        body.match(/for\s+([\d,]+\.?\d+)\s+units?/i);
    const units = unitsM ? parseAmt(unitsM[1]) : 0;

    const folioM = body.match(/Folio\s*(?:No\.?|Number)?[:\s]*(\d{4,12})/i);
    const folio = folioM?.[1] ?? '';

    const ok = isAllotment && (hasNAV || hasUnits) && nav > 0 && units > 0 && folio.length > 0;
    const status = ok ? '✅' : '❌';
    if (ok) sipPassed++;
    console.log(`${status} Test ${i + 1}: nav=${nav} units=${units} folio=${folio}`);
    if (!ok) console.log(`   SMS: ${sms.slice(0, 80)}`);
});
console.log(`\nSIP: ${sipPassed}/${SIP_TESTS.length} passed\n`);

console.log('====== Day 4: parseLoanEMI tests ======\n');
let emiPassed = 0;
EMI_TESTS.forEach((sms, i) => {
    const body = normalise(sms);

    const EMI_PATTERNS = [
        /EMI\s+(?:of\s+)?(?:Rs\.?|INR|₹)/i,
        /EMI\s+(?:debited|deducted|paid)/i,
        /equated\s+monthly\s+instalment/i,
        /EMI.*?(?:debited|deducted)/i,
        /NACH\s+(?:Debit|debit).*?(?:loan|EMI)/i,
        /towards\s+(?:your\s+)?(?:\w+\s+)?(?:loan|EMI)/i,
        /loan\s+EMI/i,
        /(?:Rs\.?|INR|₹)\s*[\d,]+\s+debited.*?loan/i,
    ];
    const matched = EMI_PATTERNS.some(p => p.test(body));

    const emiM =
        body.match(/EMI\s+(?:of\s+)?(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i) ||
        body.match(/(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s+(?:debited|deducted).*?(?:EMI|loan)/i) ||
        body.match(/NACH\s+Debit\s+(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i) ||
        body.match(/(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s+debited/i);
    const emi = emiM ? parseAmt(emiM[1]) : 0;

    const outM = body.match(/outstanding[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i);
    const outstanding = outM ? parseAmt(outM[1]) : null;

    const ok = matched && emi > 0;
    const status = ok ? '✅' : '❌';
    if (ok) emiPassed++;
    console.log(`${status} Test ${i + 1}: emiAmount=${emi} outstanding=${outstanding ?? 'not found'}`);
    if (!ok) console.log(`   SMS: ${sms.slice(0, 80)}`);
});
console.log(`\nEMI: ${emiPassed}/${EMI_TESTS.length} passed\n`);
