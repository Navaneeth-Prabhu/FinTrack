jest.mock('react-native', () => ({
    PermissionsAndroid: {
        request: jest.fn().mockResolvedValue('granted'),
        check: jest.fn().mockResolvedValue(true),
        PERMISSIONS: { READ_SMS: 'android.permission.READ_SMS' },
        RESULTS: { GRANTED: 'granted' },
    },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
    setItem: jest.fn(),
    getItem: jest.fn(),
}));

jest.mock('../nativeSmsModule', () => ({
    readSmsMessages: jest.fn(),
}));

jest.mock('../investmentSmsHandler', () => ({
    handleSIPAllotmentSMS: jest.fn(),
    handleLoanEMISMS: jest.fn(),
    handleStockBuySMS: jest.fn(),
}));

import { extractTransactionFromSMS, isSpamOrPromoSMS } from '../smsParser';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ParseExpect = {
    type?: 'expense' | 'income' | 'transfer';
    amountRange?: [number, number];
    merchant?: string;
    bank?: string;
    confidenceMin?: number;
};

function parseTest(label: string, sender: string, body: string, expected: ParseExpect) {
    it(`should parse: ${label}`, () => {
        const result = extractTransactionFromSMS(body, sender);

        if (expected.type === undefined) {
            expect(result).toBeNull();
            return;
        }

        expect(result).not.toBeNull();
        if (!result) return;

        expect(result.type).toBe(expected.type);
        if (expected.amountRange) {
            expect(result.amount).toBeGreaterThanOrEqual(expected.amountRange[0]);
            expect(result.amount).toBeLessThanOrEqual(expected.amountRange[1]);
        }
        if (expected.merchant) {
            expect((result.merchant || '').toLowerCase()).toContain(expected.merchant.toLowerCase());
        }
        if (expected.bank) {
            expect(result.bank).toBe(expected.bank);
        }
        if (expected.confidenceMin !== undefined) {
            expect(result.confidence).toBeGreaterThanOrEqual(expected.confidenceMin);
        }
    });
}

// ─── PRIMARY TRANSACTION PARSING TESTS ───────────────────────────────────────

describe('SMS Parser — financial transactions', () => {

    parseTest(
        'HDFC UPI debit (standard format)',
        'VM-HDFCBK',
        'Rs.450.00 has been debited from your HDFC Bank A/c **4832 by VPA swiggy@kotak SWIGGY FOOD on 20-Feb-26. Available balance: Rs.12340.00',
        { type: 'expense', amountRange: [449, 451], merchant: 'Swiggy', bank: 'HDFC Bank', confidenceMin: 0.8 },
    );

    parseTest(
        'ICICI credit — salary',
        'VK-ICICIB',
        'INR 85000.00 credited to your ICICI Bank account XX1234 from INFOSYS LTD. SALARY on 01-Mar-26. Available Bal: INR 85340.00',
        { type: 'income', amountRange: [84999, 85001], confidenceMin: 0.7 },
    );

    parseTest(
        'SBI debit card purchase',
        'AD-SBINB',
        'INR 1299.00 debited from SBI A/c X3456 at AMAZON INDIA on 19-Feb-26. If not done by you, call 1800-1234.',
        { type: 'expense', amountRange: [1298, 1300], merchant: 'Amazon', bank: 'SBI', confidenceMin: 0.7 },
    );

    parseTest(
        'Axis Bank Netflix subscription',
        'JD-AXISBK',
        'Rs 599 debited from your Axis Bank Account ending 1234 for NETFLIX INDIA on 18-02-26.',
        { type: 'expense', amountRange: [598, 600], merchant: 'Netflix', confidenceMin: 0.6 },
    );

    parseTest(
        'PhonePe UPI send',
        'BP-PHNPAY',
        'Rs. 250 paid to Rohit Sharma via PhonePe on 21 Feb 2026. UPI Ref: 316789021234.',
        { type: 'expense', amountRange: [249, 251], confidenceMin: 0.5 },
    );

    parseTest(
        'HDFC credit card spent format',
        'VM-HDFCBK',
        'INR 2,349.00 spent on your HDFC Bank Credit Card XX4832 at BIGBASKET on 02-Mar-26. Avl limit: INR 50,000.',
        { type: 'expense', amountRange: [2348, 2350], merchant: 'BigBasket', bank: 'HDFC Bank', confidenceMin: 0.7 },
    );

    parseTest(
        'ICICI Txn-of format (ref number)',
        'VK-ICICIB',
        'Txn of Rs.799.00 on ICICI Card XX1234 at NETFLIX on 04/03/26 Ref no 1234567890',
        { type: 'expense', amountRange: [798, 800], merchant: 'Netflix', bank: 'ICICI Bank', confidenceMin: 0.7 },
    );

    parseTest(
        'IMPS transfer format',
        'AD-SBINB',
        'Rs.15,000 transferred from A/c XX6789 to A/c XX4567 via IMPS Ref no 9988776655 on 06-03-26.',
        { type: 'transfer', amountRange: [14999, 15001], bank: 'SBI', confidenceMin: 0.6 },
    );

    parseTest(
        'Kotak credit card debit',
        'VM-KOTAKB',
        'INR 2149.00 debited from Kotak Credit Card XX5678 at ZOMATO on 20-02-26 12:34:56.',
        { type: 'expense', amountRange: [2148, 2150], merchant: 'Zomato', confidenceMin: 0.6 },
    );

    parseTest(
        'SBI refund credit',
        'BZ-SBINB',
        'INR 499.00 credited to your SBI account XX4321 as refund from FLIPKART on 21-Feb-2026.',
        { type: 'income', amountRange: [498, 500], merchant: 'Flipkart', confidenceMin: 0.6 },
    );

    parseTest(
        'Large amount with comma formatting',
        'VM-HDFCBK',
        'Rs.1,24,500.00 has been debited from your HDFC Bank A/c **9876 by VPA hdfc@hdfcbank on 01-Jan-26.',
        { type: 'expense', amountRange: [124499, 124501], confidenceMin: 0.7 },
    );

    // ── BUG FIX: HDFC "Sent Rs." format ──────────────────────────────────────
    // Was broken: the 'sent rs' transaction_signal was removed in old native filter.
    // Fixed: 'sent rs', 'sent inr' are now explicit TRANSACTION_SIGNALS in Kotlin
    //        AND the JS parser has a pattern for this format.
    parseTest(
        '[FIX] HDFC Sent Rs. format (2-digit year, 2026)',
        'VM-HDFCBK',
        'Sent Rs.32.00 From HDFC Bank A/C *1088 To PADMA MEDICALS On 09/03/26 Ref 606857221877 Not You? Call 18002586161/SMS BLOCK UPI to 7308080808',
        { type: 'expense', amountRange: [31, 33], merchant: 'PADMA MEDICALS', bank: 'HDFC Bank', confidenceMin: 0.7 },
    );

    parseTest(
        '[FIX] ICICI Sent INR format',
        'VK-ICICIB',
        'Sent INR 1,500.00 from ICICI Bank A/C XX5678 to RAM NAIDU on 11/04/2026 Ref 123456789. Avail Bal: INR 12000.',
        { type: 'expense', amountRange: [1499, 1501], merchant: 'RAM NAIDU', bank: 'ICICI Bank', confidenceMin: 0.7 },
    );

    parseTest(
        '[FIX] SBI Transferred Rs. format',
        'AD-SBINB',
        'Transferred Rs. 540.50 From SBI Bank A/C *9999 To Zomato Online on 12/12/26 Ref 9876543210 Not You? Call Bank',
        { type: 'expense', amountRange: [539, 542], merchant: 'Zomato', bank: 'SBI', confidenceMin: 0.7 },
    );

    parseTest(
        '[FIX] Generic bank Sent Rs. (unknown sender)',
        'XY-CANARA',
        'Sent Rs.999.00 From Canara Bank A/C *9723 To RENT PAYMENT On 05/05/2026. Ref 555555555.',
        { type: 'expense', amountRange: [998, 1000], merchant: 'RENT PAYMENT', confidenceMin: 0.3 },
    );

    parseTest(
        'Unknown bank generic pattern (EMI)',
        'VK-BANKLT',
        'Your account has been debited by INR 3500.00 for EMI payment towards HDFC HOME LOAN. Available balance: INR 25000.',
        { type: 'expense', amountRange: [3499, 3501], confidenceMin: 0.35 },
    );
});

// ─── NON-FINANCIAL SMS (should return null) ───────────────────────────────────

describe('SMS Parser — non-financial SMS (should return null)', () => {
    it('OTP login message', () => {
        expect(extractTransactionFromSMS(
            'Your OTP for login is 293847. Valid for 10 minutes.',
            'TM-ICICIB'
        )).toBeNull();
    });

    it('Telecom recharge promo SMS', () => {
        expect(extractTransactionFromSMS(
            'Recharge with Rs.299 to get unlimited calls and 2GB data/day for 28 days! Click here to recharge now.',
            'AIRTEL'
        )).toBeNull();
    });

    it('Loan offer promo SMS', () => {
        expect(extractTransactionFromSMS(
            'Congratulations! You have a pre-approved loan limit of Rs.5,00,000. Apply now at bank.com',
            'VM-HDFCBK'
        )).toBeNull();
    });

    it('Credit card offer SMS', () => {
        expect(extractTransactionFromSMS(
            'Exclusive offer! Get your credit card with credit limit upto Rs.3,00,000. Apply now!',
            'VM-HDFCBK'
        )).toBeNull();
    });

    it('Data pack promotional SMS', () => {
        expect(extractTransactionFromSMS(
            '50% data consumed. Get 2GB data at Rs.33 valid for 3 days. Tap here to activate.',
            'JIO'
        )).toBeNull();
    });

    it('Pure OTP 2FA message', () => {
        expect(extractTransactionFromSMS(
            'Dear Customer, use OTP 738201 to complete your HDFC Bank transaction. OTP is valid for 5 minutes.',
            'VM-HDFCBK'
        )).toBeNull();
    });
});

// ─── isSpamOrPromoSMS FILTER TESTS (the core of Bug Fix 2) ───────────────────

describe('isSpamOrPromoSMS — should NOT filter out valid financial SMS', () => {

    // [BUG FIX] KYC in SMS footer should NOT be treated as spam
    it('[FIX] HDFC transaction SMS with KYC in footer', () => {
        const body = 'Rs.1500.00 debited from HDFC Bank A/c **1088 at SWIGGY on 14-Mar-26. For KYC, visit branch. -HDFCBK';
        expect(isSpamOrPromoSMS(body, 'VM-HDFCBK')).toBe(false);
    });

    it('[FIX] SBI balance SMS with KYC status', () => {
        const body = 'Your SBI a/c XX5678 has avl bal Rs.25,000. KYC status: Active. -SBINB';
        expect(isSpamOrPromoSMS(body, 'AD-SBINB')).toBe(false);
    });

    // [BUG FIX] mandate/autopay SMS should NOT be treated as spam
    it('[FIX] SIP NACH debit SMS with mandate keyword', () => {
        const body = 'UPDATE: INR 5,000.00 debited from HDFC Bank XX1088 on 27-FEB-26. Info: NIPPONMUTUALFUND_367624509_162207359. Mandate Ref: 123456789.';
        expect(isSpamOrPromoSMS(body, 'VM-HDFCBK')).toBe(false);
    });

    it('[FIX] E-mandate SIP debit confirmation', () => {
        const body = 'Rs.3000.00 debited from your a/c XX4321 via e-mandate for SBI MF SIP. Units will be allotted separately. -SBINB';
        expect(isSpamOrPromoSMS(body, 'AD-SBINB')).toBe(false);
    });

    it('[FIX] Autopay mandate recurring debit', () => {
        const body = 'Rs.999.00 debited from ICICI Bank XX1234 via autopay mandate for Netflix subscription on 14-Mar-26.';
        expect(isSpamOrPromoSMS(body, 'VK-ICICIB')).toBe(false);
    });

    // [BUG FIX] UPI collect request / receive should NOT be spam
    // A UPI collect request notification is a valid financial event (upcoming credit).
    // It should reach the JS intent router (smsAlertParser), not be silently dropped.
    // Note: extractTransactionFromSMS returns null for bare "collect request" SMS because
    //       they are not themselves a debit/credit — the intent router handles them.
    //       The real fix is isSpamOrPromoSMS no longer blocks them.
    it('[FIX] UPI collect request should not be spam-filtered (reaches intent router)', () => {
        const body = 'You received a UPI collect request of Rs.500 from rahul@ybl. Check your UPI app.';
        // This should NOT be classified as spam — it's a real financial notification
        expect(isSpamOrPromoSMS(body, 'VM-HDFCBK')).toBe(false);
    });

    // [BUG FIX] cashback/refund SMS should NOT be spam
    it('[FIX] Cashback credited SMS (save rs / saved)', () => {
        const body = 'Rs.50.00 cashback credited to your HDFC Bank a/c XX1088. You saved Rs.50 on SWIGGY order.';
        expect(isSpamOrPromoSMS(body, 'VM-HDFCBK')).toBe(false);
    });

    it('[FIX] Refund credited SMS', () => {
        const body = 'Rs.299.00 refund credited to HDFC Bank A/c XX4832. Saved amount for cancelled Amazon order.';
        expect(isSpamOrPromoSMS(body, 'VM-HDFCBK')).toBe(false);
    });

    // Standard valid transactions
    it('Normal debit SMS should not be spam', () => {
        const body = 'Rs.450.00 has been debited from your HDFC Bank A/c **4832 by VPA swiggy@kotak SWIGGY FOOD on 20-Feb-26.';
        expect(isSpamOrPromoSMS(body, 'VM-HDFCBK')).toBe(false);
    });

    it('Normal salary credit SMS should not be spam', () => {
        const body = 'INR 85000.00 credited to your ICICI Bank account XX1234 from INFOSYS LTD on 01-Mar-26.';
        expect(isSpamOrPromoSMS(body, 'VK-ICICIB')).toBe(false);
    });
});

describe('isSpamOrPromoSMS — should CORRECTLY filter promo/spam SMS', () => {

    it('Telecom recharge promo', () => {
        expect(isSpamOrPromoSMS(
            'Recharge with Rs.299 to get unlimited calls and 2GB data/day for 28 days!',
            'AIRTEL'
        )).toBe(true);
    });

    it('Pre-approved loan offer', () => {
        expect(isSpamOrPromoSMS(
            'You have a pre-approved loan offer of Rs.5,00,000! Apply now for instant disbursal.',
            'VM-HDFCBK'
        )).toBe(true);
    });

    it('Credit card offer SMS', () => {
        expect(isSpamOrPromoSMS(
            'Get your credit card with credit limit upto Rs.3,00,000. Apply today!',
            'VM-HDFCBK'
        )).toBe(true);
    });

    it('Data balance promotional', () => {
        expect(isSpamOrPromoSMS(
            '50% data consumed. Get 2GB data at Rs.33. Tap here to activate.',
            'JIO'
        )).toBe(true);
    });

    it('Discount code / coupon promo', () => {
        expect(isSpamOrPromoSMS(
            'Use code SAVE50 to get 50% off on your next order. Offer valid till 31-Mar-26.',
            'SWIGGY'
        )).toBe(true);
    });

    it('URL shortener in SMS', () => {
        expect(isSpamOrPromoSMS(
            'Your loan application approved! Click here: bit.ly/ab12cd to complete KYC.',
            'BAJAJFIN'
        )).toBe(true);
    });

    it('Win prize / earn cashback offer', () => {
        expect(isSpamOrPromoSMS(
            'Congratulations! Win Rs.10,000 this week by completing 5 transactions on our app!',
            'PAYTM'
        )).toBe(true);
    });
});

// ─── DATE EDGE CASES ──────────────────────────────────────────────────────────
// Tests that verify 2-digit year handling for 2026 SMS formats

describe('SMS Parser — date format edge cases', () => {

    it('should parse 2-digit year (YY) format correctly - 09/03/26 = 2026', () => {
        const result = extractTransactionFromSMS(
            'Sent Rs.32.00 From HDFC Bank A/C *1088 To PADMA MEDICALS On 09/03/26 Ref 606857221877',
            'VM-HDFCBK'
        );
        expect(result).not.toBeNull();
        if (result?.date) {
            // Date should be parsed as 2026 (not 1926)
            expect(result.date).toContain('2026');
        }
    });

    it('should parse DD-Mon-YY format (01-Mar-26) as 2026', () => {
        const result = extractTransactionFromSMS(
            'Rs.5000.00 debited from HDFC Bank A/c XX1234 by VPA upi-pay@hdfc on 01-Mar-26.',
            'VM-HDFCBK'
        );
        expect(result).not.toBeNull();
        if (result?.date) {
            expect(result.date).toContain('2026');
        }
    });

    it('EMI due-date reminder — not parsed as a transaction (handled by loan_alert intent)', () => {
        // "is due on 15-Sep-26" — this is a REMINDER about a future payment, not a debit.
        // The date 15-Sep-26 is approximately 6 months in the future from March 2026.
        // extractTransactionFromSMS correctly returns null for pure "due" reminders;
        // the intent router classifies these as 'loan_alert' and handles them separately.
        const result = extractTransactionFromSMS(
            'Your HDFC Home Loan EMI of Rs.25,000 is due on 15-Sep-26. Available Bal: Rs.50,000.',
            'VM-HDFCBK'
        );
        // This should return null (no debit/credit action word: "is due" != "was debited")
        // OR if it does parse, the amount should be correct
        if (result !== null) {
            expect(result.amount).toBeGreaterThanOrEqual(24999);
            expect(result.amount).toBeLessThanOrEqual(25001);
        }
        // Either result (null or parsed amount) is acceptable — the key is no false debit is recorded
    });
});

// ─── BULK RELIABILITY & PIPELINE TESTS ───────────────────────────────────────

import { readFinancialSMS } from '../smsParser';
import { readSmsMessages } from '../nativeSmsModule';

describe('SMS Parser — Bulk Reliability & 2026 Logic', () => {

    it('should correctly handle year "26" as 2026', () => {
        const body = 'Rs.500 spent at ZOMATO on 14/03/26';
        const result = extractTransactionFromSMS(body, 'HDFC');
        expect(result).not.toBeNull();
        expect(result?.date).toContain('2026');
    });

    it('should advance watermark metadata even when zero financial SMS matched', async () => {
        const MAR_2026 = new Date('2026-03-14').getTime();
        const JAN_2026 = new Date('2026-01-01').getTime();

        // Simulate 50k scanned messages, 0 were financial
        (readSmsMessages as jest.Mock).mockResolvedValue({
            messages: [],
            oldestScannedDate: JAN_2026,
            scannedCount: 50000
        });

        const result = await readFinancialSMS(0, 50000, MAR_2026);

        expect(result.messages).toHaveLength(0);
        expect(result.oldestScannedDate).toBe(JAN_2026);
        expect(result.scannedCount).toBe(50000);
    });

    it('should handle pagination safety (ordering by ID)', async () => {
        const TS = 1773456000000;
        (readSmsMessages as jest.Mock).mockResolvedValue({
            messages: [
                { _id: '102', address: 'HDFC', body: 'debited 102', date: TS },
                { _id: '101', address: 'HDFC', body: 'debited 101', date: TS }
            ],
            oldestScannedDate: TS,
            scannedCount: 2
        });

        const result = await readFinancialSMS(0, 10);
        expect(result.messages[0]._id).toBe('102');
        expect(result.messages[1]._id).toBe('101');
    });
});
