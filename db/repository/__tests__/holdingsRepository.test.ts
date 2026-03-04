import { saveHoldingToDB, fetchHoldingsFromDB } from '../holdingsRepository';
import { initDatabase } from '../../services/sqliteService';

jest.mock('../../services/sqliteService');

describe('Holdings Repository (Test Gate 3.2)', () => {
    let mockDb: any;

    beforeEach(() => {
        mockDb = {
            runAsync: jest.fn(),
            getAllAsync: jest.fn().mockResolvedValue([]),
        };
        (initDatabase as jest.Mock).mockResolvedValue(mockDb);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('saves a holding successfully (SQL insertion)', async () => {
        const mockHolding: any = {
            id: 'test-uuid',
            type: 'stock',
            name: 'Reliance',
            quantity: 10,
            avg_buy_price: 2500,
            current_price: 2600,
            buy_date: '2023-01-01',
            updated_at: '2023-01-01',
            is_deleted: 0,
            invested_amount: 25000,
            current_value: 26000
        };

        await saveHoldingToDB(mockHolding);
        expect(mockDb.runAsync).toHaveBeenCalled();
        const sqlArg = mockDb.runAsync.mock.calls[0][0];
        expect(sqlArg).toContain('INSERT INTO holdings');
        expect(mockDb.runAsync.mock.calls[0]).toContain(mockHolding.id);
    });

    it('fetches holdings mapping optional fields correctly', async () => {
        mockDb.getAllAsync.mockResolvedValue([
            { id: '1', type: 'fd', name: 'HDFC FD', quantity: 1, avg_buy_price: 100000, current_price: 105000, is_deleted: 0, folio_number: null, ticker: null }
        ]);

        const results = await fetchHoldingsFromDB();
        expect(results).toHaveLength(1);
        expect(results[0].ticker).toBeUndefined(); // Should correctly map SQLite null to JS undefined
        expect(results[0].is_deleted).toBe(false); // 0 Maps to boolean false
    });
});
