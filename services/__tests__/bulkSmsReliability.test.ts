
import { readFinancialSMS } from '../smsParser';
import { readSmsMessages } from '../nativeSmsModule';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

describe('Bulk SMS Reliability Logic', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should advance sync pointer even on a pure "Junk Blockade"', async () => {
        const MAR_2026 = new Date('2026-03-14').getTime();
        const JAN_2026 = new Date('2026-01-01').getTime();

        // Scenario: User has 50,000+ promo messages between March and Jan.
        // The native scan hits MAX_SCAN_ROWS and returns 0 financial messages.
        (readSmsMessages as jest.Mock).mockResolvedValue({
            messages: [],
            oldestScannedDate: JAN_2026,
            scannedCount: 50000
        });

        const result = await readFinancialSMS(0, 50000, MAR_2026);

        expect(result.messages).toHaveLength(0);
        expect(result.oldestScannedDate).toBe(JAN_2026);
        expect(result.scannedCount).toBe(50000);
        
        // This verifies that the JS layer now knows the "oldest date" scanned
        // was Jan 2026, allowing SMSTransactionUtil to advance the watermark.
    });

    it('should correctly order and inclusive-paginate same-timestamp SMS', async () => {
        const TS = 1773456000000; // Some fixed timestamp
        
        // Native module now sorts by date DESC, _id DESC
        // This ensures deterministic ordering.
        const mockResponse = {
            messages: [
                { _id: '102', address: 'HDFC', body: 'debited 1', date: TS },
                { _id: '101', address: 'HDFC', body: 'debited 2', date: TS }
            ],
            oldestScannedDate: TS,
            scannedCount: 2
        };
        (readSmsMessages as jest.Mock).mockResolvedValue(mockResponse);

        const result = await readFinancialSMS(0, 10);
        expect(result.messages[0]._id).toBe('102');
        expect(result.messages[1]._id).toBe('101');
    });

    it('should parse year "26" as 2026', async () => {
        const { extractTransactionFromSMS } = require('../smsParser');
        const body = 'Rs.100 debited from A/c *1234 on 09/03/26';
        const result = extractTransactionFromSMS(body, 'HDFC');
        
        expect(result).not.toBeNull();
        // Since the current year is 2026, "26" should be 2026.
        // We check if the date contains "2026"
        expect(result.date).toContain('2026');
    });
});
